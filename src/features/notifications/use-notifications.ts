import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { applyRealtimeAuth, useAccessToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { NotificationRow } from '@/features/notifications/notification-display';

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

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => ['notifications', userId] as const,
  unread: (userId: string) => ['notifications', 'unread', userId] as const,
};

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

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async (): Promise<{ userId: string; notifications: NotificationRow[] }> => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error !== null) throw error;

      return {
        userId,
        notifications: data ?? [],
      };
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...notificationKeys.all, 'unread-count'],
    queryFn: async (): Promise<number> => {
      const userId = await getCurrentUserId();

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error !== null) throw error;

      return count ?? 0;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const userId = await getCurrentUserId();
      const readAt = new Date().toISOString();

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('id', notificationId)
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error !== null) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const userId = await getCurrentUserId();
      const readAt = new Date().toISOString();

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error !== null) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useNotificationsRealtime(): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      const userId = await getCurrentUserId();
      if (cancelled) return;

      const channelName = `notifications:${userId}`;

      const debouncedInvalidate = createDebouncedInvalidator(() => {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }, 300);

      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`,
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
