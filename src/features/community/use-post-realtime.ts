import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { applyRealtimeAuth, useAccessToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { postKeys } from '@/features/community/use-posts';

function createDebouncedInvalidator(
  invalidate: () => void,
  delayMs: number,
): () => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(invalidate, delayMs);
  };
}

function logChannelStatus(channelName: string, status: string, err?: Error): void {
  if (err !== undefined) {
    logger.warn(`[realtime] ${channelName} -> ${status}`, err);
    return;
  }
  logger.info(`[realtime] ${channelName} -> ${status}`);
}

function invalidatePostDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
}

function invalidatePostLists(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: postKeys.all });
}

/** Live updates for a single post detail screen (author + moderator observers). */
export function usePostRealtime(postId: string | null): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (postId === null || postId.length === 0 || accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const channelName = `post:${postId}`;

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      invalidatePostDetail(queryClient, postId);
      invalidatePostLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: postKeys.mine });
      void queryClient.invalidateQueries({ queryKey: postKeys.moderation });
    }, 300);

    void (async () => {
      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_posts',
            filter: `id=eq.${postId}`,
          },
          () => debouncedInvalidate(),
        )
        .subscribe((status, err) => {
          logChannelStatus(channelName, status, err);
        });
    })();

    return () => {
      cancelled = true;
      if (channel !== null) {
        void supabase.removeChannel(channel);
      }
    };
  }, [postId, accessToken, queryClient]);
}

/** Moderation queue + profile badge for pending review counts. */
export function useModerationPostsRealtime(enabled: boolean): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (!enabled || accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const channelName = 'moderation:posts';

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      void queryClient.invalidateQueries({ queryKey: postKeys.moderation });
      invalidatePostLists(queryClient);
    }, 300);

    void (async () => {
      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_posts',
          },
          () => debouncedInvalidate(),
        )
        .subscribe((status, err) => {
          logChannelStatus(channelName, status, err);
        });
    })();

    return () => {
      cancelled = true;
      if (channel !== null) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, accessToken, queryClient]);
}

/** Author's "My publications" list. */
export function useMyPostsRealtime(userId: string | null): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (userId === null || userId.length === 0 || accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const channelName = `my-posts:${userId}`;

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      void queryClient.invalidateQueries({ queryKey: postKeys.mine });
    }, 300);

    void (async () => {
      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_posts',
            filter: `author_id=eq.${userId}`,
          },
          () => debouncedInvalidate(),
        )
        .subscribe((status, err) => {
          logChannelStatus(channelName, status, err);
        });
    })();

    return () => {
      cancelled = true;
      if (channel !== null) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, accessToken, queryClient]);
}

/** Community discovery feed (nearby + all events). */
export function useCommunityPostsRealtime(): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const channelName = 'community:posts';

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      invalidatePostLists(queryClient);
    }, 300);

    void (async () => {
      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_posts',
          },
          () => debouncedInvalidate(),
        )
        .subscribe((status, err) => {
          logChannelStatus(channelName, status, err);
        });
    })();

    return () => {
      cancelled = true;
      if (channel !== null) {
        void supabase.removeChannel(channel);
      }
    };
  }, [accessToken, queryClient]);
}
