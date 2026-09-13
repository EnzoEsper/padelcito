import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isModeratorRole } from '@/features/profile/use-profile';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

export type BannedUserSummary = {
  user_id: string;
  display_name: string;
  username: string | null;
  banned_at: string;
};

export const bannedUserKeys = {
  all: ['banned-users'] as const,
};

async function currentUserIsModerator(): Promise<boolean> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error !== null || data === null) {
    return false;
  }

  return isModeratorRole(data.role);
}

function isModeratorAccessError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('only moderators') || normalized.includes('moderator access');
}

export function useBannedUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bannedUserKeys.all,
    enabled: options?.enabled ?? false,
    retry: false,
    queryFn: async (): Promise<BannedUserSummary[]> => {
      const isModerator = await currentUserIsModerator();
      if (!isModerator) {
        return [];
      }

      const { data, error } = await supabase.rpc('list_banned_users');

      if (error !== null) {
        if (isModeratorAccessError(error.message)) {
          return [];
        }
        logger.error('list_banned_users failed', error);
        throw error;
      }

      return (data ?? []).map((row) => ({
        user_id: row.user_id,
        display_name: row.display_name,
        username: row.username,
        banned_at: row.banned_at,
      }));
    },
  });
}

export function useInvalidateBannedUsers() {
  const queryClient = useQueryClient();

  return async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: bannedUserKeys.all });
  };
}
