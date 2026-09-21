import { useQuery } from '@tanstack/react-query';
import { fetchPadelSport } from '@/lib/padel-sport';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { SkillLevel } from '@/features/profile/use-profile';

export type DominantHand = Database['public']['Enums']['dominant_hand'];
export type CourtSidePreference = Database['public']['Enums']['match_position_preference'];

export type ProfileGender = Database['public']['Enums']['profile_gender'];

export type PublicProfileSummary = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  rating_avg: number | null;
  rating_count: number;
  reliability_score: number | null;
  penalty_count: number;
  commitment_count: number;
  created_at: string | null;
  gender: ProfileGender | null;
  age_years: number | null;
  skill_level: SkillLevel | null;
  dominant_hand: DominantHand | null;
  court_side_preference: CourtSidePreference | null;
  years_playing: number | null;
  notes: string | null;
};

export const publicProfileKeys = {
  detail: (userId: string) => ['public-profile', userId] as const,
};

async function fetchPublicProfile(userId: string): Promise<PublicProfileSummary | null> {
  const { data: profile, error: profileError } = await supabase
    .from('public_profiles')
    .select(
      'id, display_name, username, avatar_url, bio, rating_avg, rating_count, reliability_score, penalty_count, commitment_count, gender, age_years, created_at',
    )
    .eq('id', userId)
    .maybeSingle();

  if (profileError !== null) {
    throw profileError;
  }

  if (profile === null || profile.id === null || profile.display_name === null) {
    return null;
  }

  let skillLevel: SkillLevel | null = null;
  let dominantHand: DominantHand | null = null;
  let courtSide: CourtSidePreference | null = null;
  let yearsPlaying: number | null = null;
  let notes: string | null = null;

  try {
    const padelSport = await fetchPadelSport();
    const { data: sportProfile, error: sportError } = await supabase
      .from('profile_sports')
      .select(
        'skill_level, dominant_hand, court_side_preference, years_playing, notes',
      )
      .eq('profile_id', userId)
      .eq('sport_id', padelSport.id)
      .maybeSingle();

    if (sportError !== null) {
      throw sportError;
    }

    skillLevel = sportProfile?.skill_level ?? null;
    dominantHand = sportProfile?.dominant_hand ?? null;
    courtSide = sportProfile?.court_side_preference ?? null;
    yearsPlaying = sportProfile?.years_playing ?? null;
    notes = sportProfile?.notes ?? null;
  } catch {
    skillLevel = null;
    dominantHand = null;
    courtSide = null;
    yearsPlaying = null;
    notes = null;
  }

  return {
    id: profile.id,
    display_name: profile.display_name,
    username: profile.username,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    rating_avg: profile.rating_avg,
    rating_count: profile.rating_count ?? 0,
    reliability_score: profile.reliability_score,
    penalty_count: profile.penalty_count ?? 0,
    commitment_count: profile.commitment_count ?? 0,
    gender: profile.gender,
    age_years: profile.age_years,
    created_at: profile.created_at,
    skill_level: skillLevel,
    dominant_hand: dominantHand,
    court_side_preference: courtSide,
    years_playing: yearsPlaying,
    notes: notes,
  };
}

export function usePublicProfile(userId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: publicProfileKeys.detail(userId ?? ''),
    enabled: (options?.enabled ?? true) && userId !== null && userId.length > 0,
    queryFn: async (): Promise<PublicProfileSummary | null> => {
      if (userId === null) {
        return null;
      }
      return fetchPublicProfile(userId);
    },
    staleTime: 1000 * 60 * 2,
  });
}
