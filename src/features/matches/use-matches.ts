import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ensurePadelSport,
  PADEL_SPORT_SLUG,
  UnsupportedSportError,
} from '@/lib/padel-sport';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type MatchRow = Database['public']['Tables']['matches']['Row'];
type MatchInsert = Database['public']['Tables']['matches']['Insert'];
type ParticipantRow = Database['public']['Tables']['match_participants']['Row'];
type ParticipantStatus = Database['public']['Enums']['participant_status'];
type SkillLevel = Database['public']['Enums']['skill_level'];
type SportRow = Database['public']['Tables']['sports']['Row'];
type PublicProfileRow = Database['public']['Views']['public_profiles']['Row'];
type ContactRow = Database['public']['Functions']['match_contact_details']['Returns'][number];

export type Coords = { lat: number; lng: number };

export type CreateMatchInput = {
  title: string;
  description: string | null;
  venueName: string | null;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  coords: Coords;
  skillMin: SkillLevel | null;
  skillMax: SkillLevel | null;
};

export type MatchSummary = MatchRow & {
  sport: SportRow | null;
  host: PublicProfileRow | null;
  currentUserParticipant: ParticipantRow | null;
  acceptedVisibleCount: number;
  isHostedByCurrentUser: boolean;
};

export type MatchDetail = MatchSummary & {
  currentUserId: string;
  visibleParticipants: ParticipantRow[];
  participantProfiles: PublicProfileRow[];
  isHost: boolean;
};

export type HostRequest = {
  participant: ParticipantRow;
  match: MatchSummary;
  requester: PublicProfileRow | null;
};

export type MyMatchesData = {
  userId: string;
  upcoming: MatchSummary[];
  history: MatchSummary[];
  hostRequests: HostRequest[];
};

export const matchKeys = {
  all: ['matches'] as const,
  discover: ['matches', 'discover', PADEL_SPORT_SLUG] as const,
  mine: ['matches', 'mine', PADEL_SPORT_SLUG] as const,
  detail: (matchId: string) => ['matches', matchId] as const,
  contacts: (matchId: string) => ['matches', matchId, 'contacts'] as const,
};

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error !== null || user === null) {
    throw new Error('Not authenticated');
  }

  return user.id;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function geographyPoint(coords: Coords): unknown {
  return `POINT(${coords.lng} ${coords.lat})` as unknown;
}

async function fetchSportsByIds(ids: string[]): Promise<Map<string, SportRow>> {
  const uniqueIds = unique(ids);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .in('id', uniqueIds);

  if (error !== null) throw error;
  return new Map((data ?? []).map((sport) => [sport.id, sport]));
}

async function fetchPublicProfilesByIds(ids: string[]): Promise<Map<string, PublicProfileRow>> {
  const uniqueIds = unique(ids);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .in('id', uniqueIds);

  if (error !== null) throw error;
  return new Map(
    (data ?? [])
      .filter((profile): profile is PublicProfileRow & { id: string } => profile.id !== null)
      .map((profile) => [profile.id, profile]),
  );
}

async function fetchVisibleParticipants(matchIds: string[]): Promise<ParticipantRow[]> {
  const uniqueIds = unique(matchIds);
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from('match_participants')
    .select('*')
    .in('match_id', uniqueIds)
    .order('requested_at', { ascending: true });

  if (error !== null) throw error;
  return data ?? [];
}

function summarizeMatch(
  match: MatchRow,
  sportsById: Map<string, SportRow>,
  profilesById: Map<string, PublicProfileRow>,
  visibleParticipants: ParticipantRow[],
  userId: string,
): MatchSummary {
  const participants = visibleParticipants.filter((participant) => participant.match_id === match.id);
  return {
    ...match,
    sport: sportsById.get(match.sport_id) ?? null,
    host: profilesById.get(match.host_id) ?? null,
    currentUserParticipant:
      participants.find((participant) => participant.profile_id === userId) ?? null,
    acceptedVisibleCount:
      1 + participants.filter((participant) => participant.status === 'accepted').length,
    isHostedByCurrentUser: match.host_id === userId,
  };
}

async function hydrateSummaries(matches: MatchRow[], userId: string): Promise<MatchSummary[]> {
  const [sportsById, participants] = await Promise.all([
    fetchSportsByIds(matches.map((match) => match.sport_id)),
    fetchVisibleParticipants(matches.map((match) => match.id)),
  ]);
  const profilesById = await fetchPublicProfilesByIds(matches.map((match) => match.host_id));

  return matches.map((match) =>
    summarizeMatch(match, sportsById, profilesById, participants, userId),
  );
}

export function useDiscoverMatches() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: matchKeys.discover,
    queryFn: async () => {
      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('sport_id', padelSport.id)
        .eq('is_public', true)
        .in('status', ['open', 'full'])
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      if (error !== null) throw error;
      return hydrateSummaries(data ?? [], userId);
    },
  });
}

export function useMatchDetail(matchId: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: matchKeys.detail(matchId ?? ''),
    enabled: matchId !== null && matchId.length > 0,
    queryFn: async (): Promise<MatchDetail> => {
      if (matchId === null || matchId.length === 0) {
        throw new Error('Missing match id');
      }

      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);
      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error !== null) throw error;

      if (match.sport_id !== padelSport.id) {
        throw new UnsupportedSportError();
      }

      const [sportsById, visibleParticipants] = await Promise.all([
        fetchSportsByIds([match.sport_id]),
        fetchVisibleParticipants([match.id]),
      ]);

      const participantProfileIds = visibleParticipants.map((participant) => participant.profile_id);
      const profilesById = await fetchPublicProfilesByIds([match.host_id, ...participantProfileIds]);
      const summary = summarizeMatch(match, sportsById, profilesById, visibleParticipants, userId);

      return {
        ...summary,
        currentUserId: userId,
        visibleParticipants,
        participantProfiles: participantProfileIds
          .map((profileId) => profilesById.get(profileId))
          .filter((profile): profile is PublicProfileRow => profile !== undefined),
        isHost: match.host_id === userId,
      };
    },
  });
}

export function useMyMatches() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: matchKeys.mine,
    queryFn: async (): Promise<MyMatchesData> => {
      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);

      const [hostedResult, participantResult] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .eq('host_id', userId)
          .eq('sport_id', padelSport.id)
          .order('starts_at', { ascending: true }),
        supabase
          .from('match_participants')
          .select('*')
          .eq('profile_id', userId)
          .order('requested_at', { ascending: false }),
      ]);

      if (hostedResult.error !== null) throw hostedResult.error;
      if (participantResult.error !== null) throw participantResult.error;

      const hostedMatches = hostedResult.data ?? [];
      const ownParticipants = participantResult.data ?? [];
      const participantMatchIds = ownParticipants.map((participant) => participant.match_id);

      const participantMatches =
        participantMatchIds.length > 0
          ? await supabase
              .from('matches')
              .select('*')
              .in('id', unique(participantMatchIds))
              .eq('sport_id', padelSport.id)
          : { data: [] as MatchRow[], error: null };

      if (participantMatches.error !== null) throw participantMatches.error;

      const allMatchesById = new Map<string, MatchRow>();
      [...hostedMatches, ...(participantMatches.data ?? [])].forEach((match) => {
        allMatchesById.set(match.id, match);
      });

      const allMatches = Array.from(allMatchesById.values()).sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at),
      );
      const summaries = await hydrateSummaries(allMatches, userId);
      const now = Date.now();

      const hostedIds = hostedMatches.map((match) => match.id);
      const visibleParticipants = await fetchVisibleParticipants(hostedIds);
      const pendingRequests = visibleParticipants.filter(
        (participant) => participant.status === 'pending',
      );
      const requesterProfiles = await fetchPublicProfilesByIds(
        pendingRequests.map((participant) => participant.profile_id),
      );

      const summariesById = new Map(summaries.map((summary) => [summary.id, summary]));

      return {
        userId,
        upcoming: summaries.filter((match) => new Date(match.starts_at).getTime() >= now),
        history: summaries.filter((match) => new Date(match.starts_at).getTime() < now),
        hostRequests: pendingRequests
          .map((participant) => {
            const match = summariesById.get(participant.match_id);
            if (match === undefined) return null;
            return {
              participant,
              match,
              requester: requesterProfiles.get(participant.profile_id) ?? null,
            };
          })
          .filter((request): request is HostRequest => request !== null),
      };
    },
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMatchInput) => {
      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);
      const insert: MatchInsert = {
        host_id: userId,
        sport_id: padelSport.id,
        title: input.title.trim(),
        description: input.description,
        venue_name: input.venueName,
        starts_at: input.startsAt,
        duration_minutes: input.durationMinutes,
        capacity: input.capacity,
        skill_min: input.skillMin,
        skill_max: input.skillMax,
        location: geographyPoint(input.coords),
      };

      const { data, error } = await supabase
        .from('matches')
        .insert(insert)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: matchKeys.discover }),
        queryClient.invalidateQueries({ queryKey: matchKeys.mine }),
      ]);
    },
  });
}

export type RequestToJoinInput = {
  message: string;
  existingParticipantId?: string | null;
};

export function useRequestToJoin(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ message, existingParticipantId }: RequestToJoinInput) => {
      const userId = await getCurrentUserId();
      const trimmedMessage = message.trim() || null;

      if (existingParticipantId !== undefined && existingParticipantId !== null) {
        const { error } = await supabase
          .from('match_participants')
          .update({ status: 'pending', message: trimmedMessage })
          .eq('id', existingParticipantId)
          .eq('profile_id', userId);

        if (error !== null) throw error;
        return;
      }

      const { error } = await supabase.from('match_participants').insert({
        match_id: matchId,
        profile_id: userId,
        message: trimmedMessage,
      });

      if (error !== null) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) }),
        queryClient.invalidateQueries({ queryKey: matchKeys.discover }),
        queryClient.invalidateQueries({ queryKey: matchKeys.mine }),
      ]);
    },
  });
}

export function useUpdateParticipantStatus(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      participantId,
      status,
    }: {
      participantId: string;
      status: Extract<ParticipantStatus, 'accepted' | 'rejected' | 'withdrawn' | 'removed'>;
    }) => {
      const { error } = await supabase
        .from('match_participants')
        .update({ status })
        .eq('id', participantId);

      if (error !== null) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) }),
        queryClient.invalidateQueries({ queryKey: matchKeys.discover }),
        queryClient.invalidateQueries({ queryKey: matchKeys.mine }),
      ]);
    },
  });
}

export function useCancelPendingRequest(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase
        .from('match_participants')
        .update({ status: 'cancelled' })
        .eq('id', participantId);

      if (error !== null) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) }),
        queryClient.invalidateQueries({ queryKey: matchKeys.discover }),
        queryClient.invalidateQueries({ queryKey: matchKeys.mine }),
      ]);
    },
  });
}

export function useMatchContacts(matchId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: matchKeys.contacts(matchId ?? ''),
    enabled: enabled && matchId !== null && matchId.length > 0,
    queryFn: async (): Promise<ContactRow[]> => {
      if (matchId === null || matchId.length === 0) {
        throw new Error('Missing match id');
      }

      const { data, error } = await supabase.rpc('match_contact_details', {
        p_match_id: matchId,
      });

      if (error !== null) throw error;
      return data ?? [];
    },
  });
}
