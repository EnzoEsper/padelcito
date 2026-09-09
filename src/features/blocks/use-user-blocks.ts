import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { toUserFacingError } from '@/lib/error-message';

import { logger } from '@/lib/logger';

import { matchKeys } from '@/features/matches/use-matches';

import { postKeys } from '@/features/community/use-posts';



export const blockKeys = {

  all: ['user-blocks'] as const,

  pair: (otherUserId: string) => [...blockKeys.all, 'pair', otherUserId] as const,

};



export type BlockedUserRow = {

  blocked_id: string;

  created_at: string;

  display_name: string | null;

  username: string | null;

};



export type BlockPairStatus = {

  isBlocked: boolean;

  blockedByMe: boolean;

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



export function useBlockedUsers() {

  return useQuery({

    queryKey: blockKeys.all,

    queryFn: async (): Promise<BlockedUserRow[]> => {

      const { data: blocks, error: blocksError } = await supabase

        .from('user_blocks')

        .select('blocked_id, created_at')

        .order('created_at', { ascending: false });



      if (blocksError !== null) {

        throw blocksError;

      }



      const rows = blocks ?? [];

      if (rows.length === 0) {

        return [];

      }



      const blockedIds = rows.map((row) => row.blocked_id);

      const { data: profiles, error: profilesError } = await supabase

        .from('public_profiles')

        .select('id, display_name, username')

        .in('id', blockedIds);



      if (profilesError !== null) {

        throw profilesError;

      }



      const profileById = new Map(

        (profiles ?? []).map((profile) => [profile.id, profile]),

      );



      return rows.map((row) => {

        const profile = profileById.get(row.blocked_id);

        return {

          blocked_id: row.blocked_id,

          created_at: row.created_at,

          display_name: profile?.display_name ?? null,

          username: profile?.username ?? null,

        };

      });

    },

  });

}



export function useBlockPairStatus(otherUserId: string | null | undefined) {

  return useQuery({

    queryKey: blockKeys.pair(otherUserId ?? ''),

    enabled: otherUserId !== null && otherUserId !== undefined && otherUserId.length > 0,

    queryFn: async (): Promise<BlockPairStatus> => {
      if (otherUserId === null || otherUserId === undefined || otherUserId.length === 0) {
        return { isBlocked: false, blockedByMe: false };
      }

      const blockedUserId = otherUserId;
      const currentUserId = await getCurrentUserId();

      if (blockedUserId === currentUserId) {
        return { isBlocked: false, blockedByMe: false };
      }

      const [{ data: isBlocked, error: pairError }, { data: myBlock, error: myBlockError }] =
        await Promise.all([
          supabase.rpc('users_are_blocked', {
            p_user_a: currentUserId,
            p_user_b: blockedUserId,
          }),
          supabase
            .from('user_blocks')
            .select('blocked_id')
            .eq('blocker_id', currentUserId)
            .eq('blocked_id', blockedUserId)
            .maybeSingle(),
        ]);



      if (pairError !== null) {

        throw pairError;

      }



      if (myBlockError !== null) {

        throw myBlockError;

      }



      return {

        isBlocked: isBlocked === true,

        blockedByMe: myBlock !== null,

      };

    },

  });

}



export function useBlockUser() {

  const queryClient = useQueryClient();



  return useMutation({

    mutationFn: async (blockedId: string): Promise<void> => {

      const { error } = await supabase.rpc('block_user', { p_blocked_id: blockedId });

      if (error !== null) {

        throw error;

      }

    },

    onSuccess: async (_data, blockedId) => {

      await Promise.all([

        queryClient.invalidateQueries({ queryKey: blockKeys.all }),

        queryClient.invalidateQueries({ queryKey: blockKeys.pair(blockedId) }),

        queryClient.invalidateQueries({ queryKey: matchKeys.all }),

        queryClient.invalidateQueries({ queryKey: postKeys.all }),

      ]);

    },

    onError: (error) => {

      logger.error('block_user failed', error);

    },

  });

}



export function useUnblockUser() {

  const queryClient = useQueryClient();



  return useMutation({

    mutationFn: async (blockedId: string): Promise<void> => {

      const { error } = await supabase.rpc('unblock_user', { p_blocked_id: blockedId });

      if (error !== null) {

        throw error;

      }

    },

    onSuccess: async (_data, blockedId) => {

      await Promise.all([

        queryClient.invalidateQueries({ queryKey: blockKeys.all }),

        queryClient.invalidateQueries({ queryKey: blockKeys.pair(blockedId) }),

        queryClient.invalidateQueries({ queryKey: matchKeys.all }),

        queryClient.invalidateQueries({ queryKey: postKeys.all }),

      ]);

    },

    onError: (error) => {

      logger.error('unblock_user failed', error);

    },

  });

}



export function blockUserErrorMessage(error: unknown): string {

  return toUserFacingError(error, 'Could not update block list. Please try again.');

}



export function blockGuardMessage(status: BlockPairStatus): string {

  if (status.blockedByMe) {

    return "You've blocked this user.";

  }



  return 'This content is not available.';

}


