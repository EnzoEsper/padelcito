import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type PublicProfileStats = {
  matchesFinishedCount: number;
  mutualFinishedCount: number;
  qualityTagCounts: Record<string, number>;
};

export const publicProfileStatsKeys = {
  detail: (userId: string) => ['public-profile-stats', userId] as const,
};

function parseQualityTagCounts(value: unknown): Record<string, number> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const result: Record<string, number> = {};

  for (const [tag, count] of entries) {
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
      result[tag] = count;
    }
  }

  return result;
}

async function fetchPublicProfileStats(userId: string): Promise<PublicProfileStats> {
  const { data, error } = await supabase.rpc('public_player_profile_stats', {
    p_profile_id: userId,
  });

  if (error !== null) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (row === null || row === undefined) {
    return {
      matchesFinishedCount: 0,
      mutualFinishedCount: 0,
      qualityTagCounts: {},
    };
  }

  return {
    matchesFinishedCount: row.matches_finished_count ?? 0,
    mutualFinishedCount: row.mutual_finished_count ?? 0,
    qualityTagCounts: parseQualityTagCounts(row.quality_tag_counts),
  };
}

export function usePublicProfileStats(
  userId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: publicProfileStatsKeys.detail(userId ?? ''),
    enabled: (options?.enabled ?? true) && userId !== null && userId.length > 0,
    queryFn: async (): Promise<PublicProfileStats> => {
      if (userId === null) {
        return {
          matchesFinishedCount: 0,
          mutualFinishedCount: 0,
          qualityTagCounts: {},
        };
      }
      return fetchPublicProfileStats(userId);
    },
    staleTime: 1000 * 60 * 2,
  });
}
