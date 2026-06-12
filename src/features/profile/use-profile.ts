import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type SkillLevel = Database['public']['Enums']['skill_level'];

export type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  rating_avg: number | null;
  rating_count: number;
};

export type ProfileSport = {
  skill_level: SkillLevel;
  sport_name: string;
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

async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, rating_avg, rating_count')
    .eq('id', userId)
    .single();

  if (error !== null) throw error;
  return data;
}

async function fetchProfileSport(userId: string): Promise<ProfileSport | null> {
  const { data, error } = await supabase
    .from('profile_sports')
    .select('skill_level, sports(name)')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle();

  if (error !== null) throw error;
  if (data === null) return null;

  const sportName =
    data.sports !== null && !Array.isArray(data.sports)
      ? (data.sports as { name: string }).name
      : 'Padel';

  return {
    skill_level: data.skill_level,
    sport_name: sportName,
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const userId = await fetchCurrentUserId();
      return fetchProfile(userId);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProfileSport() {
  return useQuery({
    queryKey: ['profile', 'me', 'sport'],
    queryFn: async () => {
      const userId = await fetchCurrentUserId();
      return fetchProfileSport(userId);
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Skill level mapped to the A/B/C/D badge system from the design reference
export function skillLevelToBadge(level: SkillLevel): 'A' | 'B' | 'C' | 'D' {
  switch (level) {
    case 'pro':
      return 'A';
    case 'expert':
      return 'A';
    case 'advanced':
      return 'B';
    case 'intermediate':
      return 'C';
    case 'beginner':
      return 'D';
    default:
      return 'C';
  }
}

export const SKILL_LABEL: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'A · Pro',
  B: 'B · Adv',
  C: 'C · Int',
  D: 'D · Beg',
};
