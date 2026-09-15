import { useQuery } from '@tanstack/react-query';
import { fetchPadelSport } from '@/lib/padel-sport';
import { supabase } from '@/lib/supabase';
import type { SkillLevel } from '@/features/profile/use-profile';

export type PublicProfileSummary = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  rating_avg: number | null;
  rating_count: number;
  reliability_score: number | null;
  created_at: string | null;
  skill_level: SkillLevel | null;
};

export const publicProfileKeys = {
  detail: (userId: string) => ['public-profile', userId] as const,
};

async function fetchPublicProfile(userId: string): Promise<PublicProfileSummary | null> {
  const { data: profile, error: profileError } = await supabase
    .from('public_profiles')
    .select(
      'id, display_name, username, avatar_url, bio, rating_avg, rating_count, reliability_score, created_at',
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

  try {
    const padelSport = await fetchPadelSport();
    const { data: sportProfile, error: sportError } = await supabase
      .from('profile_sports')
      .select('skill_level')
      .eq('profile_id', userId)
      .eq('sport_id', padelSport.id)
      .maybeSingle();

    if (sportError !== null) {
      throw sportError;
    }

    skillLevel = sportProfile?.skill_level ?? null;
  } catch {
    skillLevel = null;
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
    created_at: profile.created_at,
    skill_level: skillLevel,
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
