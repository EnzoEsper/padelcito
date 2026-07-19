import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ensurePadelSport,
  PADEL_SPORT_SLUG,
  UnsupportedSportError,
} from '@/lib/padel-sport';
import { roundCoordsForKey, type Coords } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { POST_DISCOVERY_RADIUS_M } from '@/features/community/post-display';
import type { Database } from '@/types/database';

type CommunityPostRow = Database['public']['Tables']['community_posts']['Row'];
type CommunityPostInsert = Database['public']['Tables']['community_posts']['Insert'];
type CommunityPostType = Database['public']['Enums']['community_post_type'];
type CommunityPostStatus = Database['public']['Enums']['community_post_status'];
type CommunityPostReportReason = Database['public']['Enums']['community_post_report_reason'];
type PublicProfileRow = Database['public']['Views']['public_profiles']['Row'];
type SportRow = Database['public']['Tables']['sports']['Row'];

export type PostSummary = CommunityPostRow & {
  author: PublicProfileRow | null;
  sport: SportRow | null;
  distanceM?: number;
};

export type PostDetail = PostSummary & {
  currentUserId: string;
  isAuthor: boolean;
  isModerator: boolean;
};

export type CreatePostInput = {
  type: CommunityPostType;
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

export type UpdatePostInput = {
  postId: string;
  type: CommunityPostType;
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

export type ModeratePostInput = {
  postId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string | null;
};

export type ReportPostInput = {
  postId: string;
  reason: CommunityPostReportReason;
  comment?: string | null;
};

export const postKeys = {
  all: ['community_posts'] as const,
  nearbyPrefix: ['community_posts', 'nearby', PADEL_SPORT_SLUG] as const,
  nearby: (coords: Coords, typeFilter: CommunityPostType | 'all') =>
    [...postKeys.nearbyPrefix, roundCoordsForKey(coords), typeFilter] as const,
  allEventsPrefix: ['community_posts', 'all-events', PADEL_SPORT_SLUG] as const,
  allEvents: (typeFilter: CommunityPostType | 'all') =>
    [...postKeys.allEventsPrefix, typeFilter] as const,
  detail: (postId: string) => ['community_posts', postId] as const,
  mine: ['community_posts', 'mine'] as const,
  moderation: ['community_posts', 'moderation'] as const,
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

async function hydratePostSummaries(
  rows: CommunityPostRow[],
  distanceById?: Map<string, number>,
): Promise<PostSummary[]> {
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

function assertPadelPost(
  post: CommunityPostRow,
  padelSportId: string,
): void {
  if (post.sport_id !== padelSportId) {
    throw new UnsupportedSportError();
  }
}

export function useNearbyPosts(coords: Coords | null, typeFilter: CommunityPostType | 'all') {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey:
      coords !== null
        ? postKeys.nearby(coords, typeFilter)
        : postKeys.nearbyPrefix,
    enabled: coords !== null,
    queryFn: async (): Promise<PostSummary[]> => {
      if (coords === null) return [];

      const padelSport = await ensurePadelSport(queryClient);
      const { data: nearby, error: nearbyError } = await supabase.rpc('nearby_community_posts', {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius_m: POST_DISCOVERY_RADIUS_M,
        p_sport_id: padelSport.id,
        p_type: typeFilter === 'all' ? undefined : typeFilter,
      });

      if (nearbyError !== null) throw nearbyError;
      if (nearby === null || nearby.length === 0) return [];

      const ids = nearby.map((row) => row.id);
      const distanceById = new Map(nearby.map((row) => [row.id, row.distance_m]));

      const { data: posts, error } = await supabase
        .from('community_posts')
        .select('*')
        .in('id', ids)
        .eq('status', 'approved');

      if (error !== null) throw error;

      const order = new Map(ids.map((id, index) => [id, index]));
      const sorted = [...(posts ?? [])].sort(
        (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      );

      return hydratePostSummaries(sorted, distanceById);
    },
  });
}

export function useAllPosts(typeFilter: CommunityPostType | 'all') {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: postKeys.allEvents(typeFilter),
    queryFn: async (): Promise<PostSummary[]> => {
      const padelSport = await ensurePadelSport(queryClient);
      const nowIso = new Date().toISOString();

      let query = supabase
        .from('community_posts')
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
      return hydratePostSummaries(data ?? []);
    },
  });
}

export function usePostDetail(postId: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: postKeys.detail(postId ?? ''),
    enabled: postId !== null && postId.length > 0,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3000),
    queryFn: async (): Promise<PostDetail> => {
      if (postId === null || postId.length === 0) {
        throw new Error('Missing post id');
      }

      const userId = await getCurrentUserId();
      const [padelSport, roleInfo] = await Promise.all([
        ensurePadelSport(queryClient),
        fetchProfileRole(userId),
      ]);

      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error !== null) throw error;
      assertPadelPost(data, padelSport.id);

      const [summary] = await hydratePostSummaries([data]);

      return {
        ...summary,
        currentUserId: userId,
        isAuthor: data.author_id === userId,
        isModerator: isModeratorRole(roleInfo.role),
      };
    },
  });
}

export function useMyPosts() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: postKeys.mine,
    queryFn: async (): Promise<PostSummary[]> => {
      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);

      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('author_id', userId)
        .eq('sport_id', padelSport.id)
        .order('created_at', { ascending: false });

      if (error !== null) throw error;
      return hydratePostSummaries(data ?? []);
    },
  });
}

export function useModerationQueue(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: postKeys.moderation,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<PostSummary[]> => {
      const userId = await getCurrentUserId();
      const [padelSport, roleInfo] = await Promise.all([
        ensurePadelSport(queryClient),
        fetchProfileRole(userId),
      ]);

      if (!isModeratorRole(roleInfo.role)) {
        throw new Error('Moderator access required');
      }

      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('sport_id', padelSport.id)
        .in('status', ['pending_review', 'rejected'])
        .order('report_count', { ascending: false })
        .order('created_at', { ascending: true });

      if (error !== null) throw error;
      return hydratePostSummaries(data ?? []);
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

export function useAttachPostImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string; imagePath: string }) => {
      const { data, error } = await supabase
        .from('community_posts')
        .update({ image_path: input.imagePath })
        .eq('id', input.postId)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.detail(input.postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.mine }),
        queryClient.invalidateQueries({ queryKey: postKeys.moderation }),
      ]);
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const [userId, padelSport] = await Promise.all([
        getCurrentUserId(),
        ensurePadelSport(queryClient),
      ]);

      const insert: CommunityPostInsert = {
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
        .from('community_posts')
        .insert(insert)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.mine }),
        queryClient.invalidateQueries({ queryKey: postKeys.moderation }),
      ]);
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePostInput) => {
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
        ...(input.resubmit === true ? { status: 'pending_review' as CommunityPostStatus } : {}),
      };

      const { data, error } = await supabase
        .from('community_posts')
        .update(patch)
        .eq('id', input.postId)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.detail(input.postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.mine }),
        queryClient.invalidateQueries({ queryKey: postKeys.moderation }),
      ]);
    },
  });
}

export function useModeratePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModeratePostInput) => {
      const patch =
        input.status === 'approved'
          ? { status: 'approved' as CommunityPostStatus, rejection_reason: null }
          : {
              status: 'rejected' as CommunityPostStatus,
              rejection_reason: input.rejectionReason?.trim() || 'Rejected by moderator',
            };

      const { data, error } = await supabase
        .from('community_posts')
        .update(patch)
        .eq('id', input.postId)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.detail(input.postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.moderation }),
      ]);
    },
  });
}

export function useReportPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReportPostInput) => {
      const userId = await getCurrentUserId();

      const { error } = await supabase.from('community_post_reports').insert({
        community_post_id: input.postId,
        reporter_id: userId,
        reason: input.reason,
        comment: input.comment?.trim() || null,
      });

      if (error !== null) throw error;
      return input.postId;
    },
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.detail(input.postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.moderation }),
      ]);
    },
  });
}

export function useBanPostAuthor() {
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
      await queryClient.invalidateQueries({ queryKey: postKeys.moderation });
    },
  });
}

export function useArchivePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase
        .from('community_posts')
        .update({ status: 'archived' })
        .eq('id', postId)
        .select('id')
        .single();

      if (error !== null) throw error;
      return data.id;
    },
    onSuccess: async (postId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.mine }),
      ]);
    },
  });
}
