import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { matchKeys } from '@/features/matches/use-matches';
import { notificationKeys } from '@/features/notifications/use-notifications';
import type { Database } from '@/types/database';

type RatingInsert = Database['public']['Tables']['ratings']['Insert'];
type RatingRow = Database['public']['Tables']['ratings']['Row'];
type PendingRatingMatch =
  Database['public']['Functions']['get_pending_rating_matches']['Returns'][number];

export type RatableMember = {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  ratingAvg: number | null;
  alreadyRated: boolean;
  existingStars: number | null;
  existingTags: string[];
};

export type RatableMatchData = {
  matchId: string;
  matchTitle: string;
  venueName: string | null;
  members: RatableMember[];
  allRated: boolean;
  ratingWindowOpen: boolean;
};

export type SubmitRatingEntry = {
  rateeId: string;
  stars: number;
  tags: string[];
};

export type SubmitRatingsInput = {
  matchId: string;
  entries: SubmitRatingEntry[];
  comment: string | null;
};

export const ratingKeys = {
  all: ['ratings'] as const,
  pending: ['ratings', 'pending'] as const,
  match: (matchId: string) => ['ratings', 'match', matchId] as const,
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

function memberLabel(profile: { display_name: string | null } | undefined): string {
  const name = profile?.display_name;
  if (name !== null && name !== undefined && name.length > 0) {
    return name;
  }
  return 'Player';
}

async function fetchMatchMemberIds(matchId: string): Promise<{ hostId: string; memberIds: string[] }> {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('host_id')
    .eq('id', matchId)
    .single();

  if (matchError !== null) throw matchError;

  const { data: participants, error: participantError } = await supabase
    .from('match_participants')
    .select('profile_id')
    .eq('match_id', matchId)
    .eq('status', 'accepted');

  if (participantError !== null) throw participantError;

  const memberIds = [
    match.host_id,
    ...(participants ?? []).map((participant) => participant.profile_id),
  ];

  return {
    hostId: match.host_id,
    memberIds: Array.from(new Set(memberIds)),
  };
}

export async function fetchRatableMatch(matchId: string): Promise<RatableMatchData> {
  const userId = await getCurrentUserId();

  const { error: syncError } = await supabase.rpc('sync_match_lifecycle', {
    p_match_id: matchId,
  });
  if (syncError !== null) throw syncError;

  const [{ data: match, error: matchError }, { data: existingRatings, error: ratingsError }] =
    await Promise.all([
      supabase
        .from('matches')
        .select('id, title, venue_name, status, finished_at')
        .eq('id', matchId)
        .single(),
      supabase
        .from('ratings')
        .select('ratee_id, stars, tags')
        .eq('match_id', matchId)
        .eq('rater_id', userId)
        .eq('context', 'standard'),
    ]);

  if (matchError !== null) throw matchError;
  if (ratingsError !== null) throw ratingsError;

  const ratingWindowOpen =
    match.status === 'finished' &&
    match.finished_at !== null &&
    new Date(match.finished_at).getTime() + 14 * 24 * 60 * 60 * 1000 >= Date.now();

  const { memberIds } = await fetchMatchMemberIds(matchId);
  const otherMemberIds = memberIds.filter((memberId) => memberId !== userId);

  if (otherMemberIds.length === 0 || memberIds.length < 2) {
    return {
      matchId,
      matchTitle: match.title,
      venueName: match.venue_name,
      members: [],
      allRated: true,
      ratingWindowOpen,
    };
  }

  const { data: profiles, error: profileError } = await supabase
    .from('public_profiles')
    .select('id, display_name, avatar_url, rating_avg')
    .in('id', otherMemberIds);

  if (profileError !== null) throw profileError;

  const ratingsByRatee = new Map<string, Pick<RatingRow, 'stars' | 'tags'>>(
    (existingRatings ?? []).map((rating) => [rating.ratee_id, rating]),
  );

  const members: RatableMember[] = otherMemberIds.map((profileId) => {
    const profile = (profiles ?? []).find((row) => row.id === profileId);
    const existing = ratingsByRatee.get(profileId);

    return {
      profileId,
      displayName: memberLabel(profile),
      avatarUrl: profile?.avatar_url ?? null,
      ratingAvg: profile?.rating_avg ?? null,
      alreadyRated: existing !== undefined,
      existingStars: existing?.stars ?? null,
      existingTags: existing?.tags ?? [],
    };
  });

  return {
    matchId,
    matchTitle: match.title,
    venueName: match.venue_name,
    members,
    allRated: members.every((member) => member.alreadyRated),
    ratingWindowOpen,
  };
}

export async function fetchPendingRatingMatches(): Promise<PendingRatingMatch[]> {
  const { data, error } = await supabase.rpc('get_pending_rating_matches');
  if (error !== null) throw error;
  return data ?? [];
}

export function useRatableMatch(matchId: string | null) {
  return useQuery({
    queryKey: ratingKeys.match(matchId ?? ''),
    enabled: matchId !== null && matchId.length > 0,
    queryFn: () => {
      if (matchId === null || matchId.length === 0) {
        throw new Error('Missing match id');
      }
      return fetchRatableMatch(matchId);
    },
  });
}

export function usePendingRatingMatches() {
  return useQuery({
    queryKey: ratingKeys.pending,
    queryFn: fetchPendingRatingMatches,
  });
}

export function usePendingRatingCount() {
  const query = usePendingRatingMatches();
  const count = query.data?.length ?? 0;
  const pendingMatchIds = new Set((query.data ?? []).map((row) => row.match_id));

  return {
    ...query,
    count,
    pendingMatchIds,
  };
}

export function useSubmitRatings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitRatingsInput) => {
      const raterId = await getCurrentUserId();
      const trimmedComment = input.comment?.trim() ?? '';

      if (input.entries.length === 0) {
        throw new Error('Select at least one rating to submit');
      }

      const inserts: RatingInsert[] = input.entries.map((entry) => ({
        match_id: input.matchId,
        rater_id: raterId,
        ratee_id: entry.rateeId,
        stars: entry.stars,
        tags: entry.tags,
        context: 'standard',
        comment: trimmedComment.length > 0 ? trimmedComment : null,
      }));

      const { error } = await supabase.from('ratings').insert(inserts);
      if (error !== null) throw error;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ratingKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        queryClient.invalidateQueries({ queryKey: matchKeys.detail(variables.matchId) }),
        queryClient.invalidateQueries({ queryKey: matchKeys.mine }),
      ]);
    },
  });
}
