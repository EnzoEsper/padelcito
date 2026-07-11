import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type SkillLevel = Database['public']['Enums']['skill_level'];
export type UserRole = Database['public']['Enums']['user_role'];

export type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  rating_avg: number | null;
  rating_count: number;
  reliability_score: number | null;
  penalty_count: number;
  commitment_count: number;
  role: UserRole;
  banned_at: string | null;
  whatsapp_phone: string | null;
  whatsapp_verified_at: string | null;
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
    .select(
      'id, username, display_name, avatar_url, bio, rating_avg, rating_count, reliability_score, penalty_count, commitment_count, role, banned_at, whatsapp_phone, whatsapp_verified_at',
    )
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

export function isModeratorRole(role: UserRole): boolean {
  return role === 'moderator' || role === 'admin';
}

/** Human-readable skill level from onboarding (beginner → pro). */
export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
  pro: 'Pro',
};

export type SkillLevelColors = {
  bg: string;
  fg: string;
};

export const SKILL_LEVEL_COLORS: Record<SkillLevel, SkillLevelColors> = {
  pro: { bg: '#2B396D', fg: '#E4E4E4' },
  expert: { bg: '#2B396D', fg: '#E4E4E4' },
  advanced: { bg: 'rgba(68,88,166,0.18)', fg: '#A9B6E6' },
  intermediate: { bg: '#232429', fg: 'rgba(228,228,228,0.60)' },
  beginner: { bg: '#232429', fg: 'rgba(228,228,228,0.38)' },
};
