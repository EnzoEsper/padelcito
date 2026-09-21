import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPadelSport } from '@/lib/padel-sport';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { SkillLevel } from '@/features/profile/use-profile';
import { publicProfileKeys } from '@/features/profile/use-public-profile';

export type DominantHand = Database['public']['Enums']['dominant_hand'];
export type CourtSidePreference = Database['public']['Enums']['match_position_preference'];

export type PlayingProfile = {
  skill_level: SkillLevel;
  dominant_hand: DominantHand;
  court_side_preference: CourtSidePreference;
  years_playing: number | null;
  notes: string | null;
};

export type UpdatePlayingProfileInput = {
  skill_level?: SkillLevel;
  dominant_hand?: DominantHand;
  court_side_preference?: CourtSidePreference;
  years_playing?: number | null;
  notes?: string | null;
};

export const playingProfileKeys = {
  me: ['profile', 'me', 'playing'] as const,
};

async function fetchCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error !== null || user === null) {
    throw new Error('Not authenticated');
  }
  return user.id;
}

async function fetchPlayingProfile(userId: string): Promise<PlayingProfile | null> {
  const padelSport = await fetchPadelSport();
  const { data, error } = await supabase
    .from('profile_sports')
    .select(
      'skill_level, dominant_hand, court_side_preference, years_playing, notes',
    )
    .eq('profile_id', userId)
    .eq('sport_id', padelSport.id)
    .maybeSingle();

  if (error !== null) {
    throw error;
  }

  if (data === null) {
    return null;
  }

  return {
    skill_level: data.skill_level,
    dominant_hand: data.dominant_hand,
    court_side_preference: data.court_side_preference,
    years_playing: data.years_playing,
    notes: data.notes,
  };
}

export function usePlayingProfile() {
  return useQuery({
    queryKey: playingProfileKeys.me,
    queryFn: async () => {
      const userId = await fetchCurrentUserId();
      return fetchPlayingProfile(userId);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdatePlayingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePlayingProfileInput): Promise<void> => {
      const userId = await fetchCurrentUserId();
      const padelSport = await fetchPadelSport();

      const existing = await fetchPlayingProfile(userId);
      const { error } = await supabase.from('profile_sports').upsert(
        {
          profile_id: userId,
          sport_id: padelSport.id,
          skill_level: input.skill_level ?? existing?.skill_level ?? 'intermediate',
          dominant_hand: input.dominant_hand ?? existing?.dominant_hand ?? 'unspecified',
          court_side_preference:
            input.court_side_preference ?? existing?.court_side_preference ?? 'any',
          years_playing:
            input.years_playing !== undefined
              ? input.years_playing
              : (existing?.years_playing ?? null),
          notes:
            input.notes !== undefined ? input.notes : (existing?.notes ?? null),
        },
        { onConflict: 'profile_id,sport_id' },
      );

      if (error !== null) {
        throw error;
      }
    },
    onSuccess: async () => {
      const userId = await fetchCurrentUserId();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: playingProfileKeys.me }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'me', 'sport'] }),
        queryClient.invalidateQueries({ queryKey: publicProfileKeys.detail(userId) }),
      ]);
    },
  });
}
