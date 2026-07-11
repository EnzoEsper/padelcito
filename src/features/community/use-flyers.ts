import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ensurePadelSport,
  PADEL_SPORT_SLUG,
  UnsupportedSportError,
} from '@/lib/padel-sport';
import { roundCoordsForKey, type Coords } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { FLYER_DISCOVERY_RADIUS_M } from '@/features/community/flyer-display';
import type { Database } from '@/types/database';

type FlyerRow = Database['public']['Tables']['flyers']['Row'];
type FlyerInsert = Database['public']['Tables']['flyers']['Insert'];
type FlyerType = Database['public']['Enums']['flyer_type'];
type FlyerStatus = Database['public']['Enums']['flyer_status'];
type FlyerReportReason = Database['public']['Enums']['flyer_report_reason'];
type PublicProfileRow = Database['public']['Views']['public_profiles']['Row'];
type SportRow = Database['public']['Tables']['sports']['Row'];

export type FlyerSummary = FlyerRow & {
  author: PublicProfileRow | null;
  sport: SportRow | null;
  distanceM?: number;
};

export type FlyerDetail = FlyerSummary & {
  currentUserId: string;
  isAuthor: boolean;
  isModerator: boolean;
};

export type CreateFlyerInput = {
  type: FlyerType;
  title: string;
  description: string | null;
  imagePath: string | null;
  venueName: string | null;
  formattedAddress: string | null;
  coords: Coords;
  eventStart: string | null;
  eventEnd: string | null;
  contactPhone: string;
};

export type UpdateFlyerInput = {
  flyerId: string;
  type: FlyerType;
  title: string;
  description: string | null;
  imagePath: string | null;
  venueName: string | null;
  formattedAddress: string | null;
  coords: Coords;
  eventStart: string | null;
  eventEnd: string | null;
  resubmit?: boolean;
};

export type ModerateFlyerInput = {
  flyerId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string | null;
};

export type ReportFlyerInput = {
  flyerId: string;
  reason: FlyerReportReason;
  comment?: string | null;
};

export const flyerKeys = {
  all: ['flyers'] as const,
  nearbyPrefix: ['flyers', 'nearby', PADEL_SPORT_SLUG] as const,
  nearby: (coords: Coords, typeFilter: FlyerType | 'all') =>
    [...flyerKeys.nearbyPrefix, roundCoordsForKey(coords), typeFilter] as const,
  allEventsPrefix: ['flyers', 'all-events', PADEL_SPORT_SLUG] as const,
  allEvents: (typeFilter: FlyerType | 'all') =>
    [...flyerKeys.allEventsPrefix, typeFilter] as const,
  detail: (flyerId: string) => ['flyers', flyerId] as const,
  mine: ['flyers', 'mine'] as const,
  moderation: ['flyers', 'moderation'] as const,
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

function geographyPoint(coords: Coords): unknown {
  return `POINT(${coords.lng} ${coords.lat})` as unknown;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

async function fetchPublicProfilesByIds(ids: string[]): Promise<Map<string, PublicProfileRow>> {
  const uniqueIds = unique(ids);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .in('id', uniqueIds);

  if (error !== null) throw error;
  const map = new Map<string, PublicProfileRow>();
  for (const profile of data ?? []) {
    if (profile.id !== null) {
      map.set(profile.id, profile);
    }
  }
  return map;
}

async function fetchSportsByIds(ids: string[]): Promise<Map<string, SportRow>> {
  const uniqueIds = unique(ids);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.from('sports').select('*').in('id', uniqueIds);
  if (error !== null) throw error;
  return new Map((data ?? []).map((sport) => [sport.id, sport]));
}

async function fetchProfileRole(userId: string): Promise<{
  role: Database['public']['Enums']['user_role'];
  bannedAt: string | null;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, banned_at')
    .eq('id', userId)
    .single();

  if (error !== null) throw error;
  return {
    role: data.role,
    bannedAt: data.banned_at,
  };
}

async function fetchProfileWhatsApp(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('whatsapp_phone')
    .eq('id', userId)
    .single();

  if (error !== null) throw error;
  return data.whatsapp_phone;
}

function isModeratorRole(role: Database['public']['Enums']['user_role']): boolean {
  return role === 'moderator' || role === 'admin';
}

async function hydrateFlyerSummaries(
  rows: FlyerRow[],
  distanceById?: Map<string, number>,
): Promise<FlyerSummary[]> {
  const authorIds = rows.map((row) => row.author_id);
  const sportIds = rows.map((row) => row.sport_id);
  const [authors, sports] = await Promise.all([
    fetchPublicProfilesByIds(authorIds),
    fetchSportsByIds(sportIds),
  ]);

  return rows.map((row) => ({
    ...row,
    author: authors.get(row.author_id) ?? null,
    sport: sports.get(row.sport_id) ?? null,
    distanceM: distanceById?.get(row.id),
  }));
}

function assertPadelFlyer(
  flyer: FlyerRow,
  padelSportId: string,
): void {
  if (flyer.sport_id !== padelSportId) {
    throw new UnsupportedSportError();
  }
}

export function useNearbyFlyers(coords: Coords | null, typeFilter: FlyerType | 'all') {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey:
      coords !== null
        ? flyerKeys.nearby(coords, typeFilter)
        : flyerKeys.nearbyPrefix,
    enabled: coords !== null,
    queryFn: async (): Promise<FlyerSummary[]> => {
      if (coords === null) return [];

      const padelSport = await ensurePadelSport(queryClient);
      const { data: nearby, error: nearbyError } = await supabase.rpc('nearby_flyers', {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius_m: FLYER_DISCOVERY_RADIUS_M,
        p_sport_id: padelSport.id,
        p_type: typeFilter === 'all' ? undefined : typeFilter,
      });

      if (nearbyError !== null) throw nearbyError;
      if (nearby === null || nearby.length === 0) return [];

      const ids = nearby.map((row) => row.id);
      const distanceById = new Map(nearby.map((row) => [row.id, row.distance_m]));

      const { data: flyers, error } = await supabase
        .from('flyers')
        .select('*')
        .in('id', ids)
        .eq('status', 'approved');

      if (error !== null) throw error;

      const order = new Map(ids.map((id, index) => [id, index]));
      const sorted = [...(flyers ?? [])].sort(
        (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      );

      return hydrateFlyerSummaries(sorted, distanceById);
    },
  });
}

export function useAllFlyers(typeFilter: FlyerType | 'all') {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: flyerKeys.allEvents(typeFilter),
    queryFn: async (): Promise<FlyerSummary[]> => {
      const padelSport = await ensurePadelSport(queryClient);
      const nowIso = new Date().toISOString();

      let query = supabase
        .from('flyers')
        .select('*')
        .eq('status', 'approved')
        .eq('sport_id', padelSport.id)
        .or(`event_end.is.null,event_end.gte.${nowIso}`)
        .order('event_start', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error !== null) throw error;
      return hydrateFlyerSummaries(data ?? []);
    },
  });
}

export function useFlyerDetail(flyerId: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: flyerKeys.detail(flyerId ?? ''),
    enabled: flyerId !== null && flyerId.length > 0,
    queryFn: async (): Promise<FlyerDetail> => {
      if (flyerId === null || flyerId.length === 0) {
        throw new Error('Missing flyer id');
      }

      const userId = await getCurrentUserId();
      const [padelSport, roleInfo] = await Promise.all([
        ensurePadelSport(queryClient),
        fetchProfileRole(userId),
      ]);

      const { data, error } = await supabase
        .from('flyers')
        .select('*')
        .eq('id', flyerId)
        .single();

      if (error !== null) throw error;
      assertPadelFlyer(data, padelSport.id);

      const [summary] = await hydrateFlyerSummaries([data]);

      return {
        ...summary,
        currentUserId: userId,
        isAuthor: data.author_id === userId,
        isModerator: isModeratorRole(roleInfo.role),
      };
    },
  });
}

export function useMyFlyers() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: flyerKeys.mine,
    queryFn: async (): Promise<FlyerSummary[]> => {
      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);

      const { data, error } = await supabase
        .from('flyers')
        .select('*')
        .eq('author_id', userId)
        .eq('sport_id', padelSport.id)
        .order('created_at', { ascending: false });

      if (error !== null) throw error;
      return hydrateFlyerSummaries(data ?? []);
    },
  });
}

export function useModerationQueue() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: flyerKeys.moderation,
    queryFn: async (): Promise<FlyerSummary[]> => {
      const userId = await getCurrentUserId();
      const [padelSport, roleInfo] = await Promise.all([
        ensurePadelSport(queryClient),
        fetchProfileRole(userId),
      ]);

      if (!isModeratorRole(roleInfo.role)) {
        throw new Error('Moderator access required');
      }

      const { data, error } = await supabase
        .from('flyers')
        .select('*')
        .eq('sport_id', padelSport.id)
        .in('status', ['pending_review', 'rejected'])
        .order('report_count', { ascending: false })
        .order('created_at', { ascending: true });

      if (error !== null) throw error;
      return hydrateFlyerSummaries(data ?? []);
    },
  });
}

export function useProfileContactGate() {
  return useQuery({
    queryKey: ['profile', 'contact-gate'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const phone = await fetchProfileWhatsApp(userId);
      const roleInfo = await fetchProfileRole(userId);
      return {
        userId,
        whatsappPhone: phone,
        isBanned: roleInfo.bannedAt !== null,
        role: roleInfo.role,
        isModerator: isModeratorRole(roleInfo.role),
      };
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateFlyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFlyerInput) => {
      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);

      const insert: FlyerInsert = {
        author_id: userId,
        sport_id: padelSport.id,
        type: input.type,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        image_path: input.imagePath,
        venue_name: input.venueName?.trim() || null,
        formatted_address: input.formattedAddress?.trim() || null,
        location: geographyPoint(input.coords),
        event_start: input.eventStart,
        event_end: input.eventEnd,
        contact_phone: input.contactPhone,
        status: 'pending_review',
      };

      const { data, error } = await supabase
        .from('flyers')
        .insert(insert)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: flyerKeys.all }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.mine }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.moderation }),
      ]);
    },
  });
}

export function useUpdateFlyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateFlyerInput) => {
      await ensurePadelSport(queryClient);

      const patch = {
        type: input.type,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        image_path: input.imagePath,
        venue_name: input.venueName?.trim() || null,
        formatted_address: input.formattedAddress?.trim() || null,
        location: geographyPoint(input.coords),
        event_start: input.eventStart,
        event_end: input.eventEnd,
        ...(input.resubmit === true ? { status: 'pending_review' as FlyerStatus } : {}),
      };

      const { data, error } = await supabase
        .from('flyers')
        .update(patch)
        .eq('id', input.flyerId)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: flyerKeys.detail(input.flyerId) }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.all }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.mine }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.moderation }),
      ]);
    },
  });
}

export function useModerateFlyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModerateFlyerInput) => {
      const patch =
        input.status === 'approved'
          ? { status: 'approved' as FlyerStatus, rejection_reason: null }
          : {
              status: 'rejected' as FlyerStatus,
              rejection_reason: input.rejectionReason?.trim() || 'Rejected by moderator',
            };

      const { data, error } = await supabase
        .from('flyers')
        .update(patch)
        .eq('id', input.flyerId)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: flyerKeys.detail(input.flyerId) }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.all }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.moderation }),
      ]);
    },
  });
}

export function useReportFlyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReportFlyerInput) => {
      const userId = await getCurrentUserId();

      const { error } = await supabase.from('flyer_reports').insert({
        flyer_id: input.flyerId,
        reporter_id: userId,
        reason: input.reason,
        comment: input.comment?.trim() || null,
      });

      if (error !== null) throw error;
      return input.flyerId;
    },
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: flyerKeys.detail(input.flyerId) }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.moderation }),
      ]);
    },
  });
}

export function useBanFlyerAuthor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { userId: string; banned: boolean }) => {
      const { error } = await supabase.rpc('set_user_banned', {
        p_user_id: input.userId,
        p_banned: input.banned,
      });

      if (error !== null) throw error;
      return input.userId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: flyerKeys.moderation });
    },
  });
}

export function useArchiveFlyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flyerId: string) => {
      const { data, error } = await supabase
        .from('flyers')
        .update({ status: 'archived' })
        .eq('id', flyerId)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async (flyerId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: flyerKeys.detail(flyerId) }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.all }),
        queryClient.invalidateQueries({ queryKey: flyerKeys.mine }),
      ]);
    },
  });
}
