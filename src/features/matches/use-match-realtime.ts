import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { applyRealtimeAuth, useAccessToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { matchKeys } from "@/features/matches/use-matches";

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

export function useMatchRealtime(matchId: string | null): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (matchId === null || matchId.length === 0 || accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const channelName = `match:${matchId}`;

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      void queryClient.invalidateQueries({
        queryKey: matchKeys.detail(matchId),
      });
      void queryClient.invalidateQueries({ queryKey: matchKeys.mine });
      void queryClient.invalidateQueries({ queryKey: matchKeys.discoverPrefix });
    }, 300);

    void (async () => {
      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_participants",
            filter: `match_id=eq.${matchId}`,
          },
          () => debouncedInvalidate(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matches",
            filter: `id=eq.${matchId}`,
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
  }, [matchId, accessToken, queryClient]);
}

export function useMyMatchesRealtime(userId: string | null): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (userId === null || userId.length === 0 || accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const channelName = `my-matches:${userId}`;

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.mine });
    }, 300);

    void (async () => {
      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_participants",
            filter: `profile_id=eq.${userId}`,
          },
          () => debouncedInvalidate(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_participants",
          },
          () => debouncedInvalidate(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matches",
            filter: `host_id=eq.${userId}`,
          },
          () => debouncedInvalidate(),
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matches",
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

export function useDiscoverMatchesRealtime(): void {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  useEffect(() => {
    if (accessToken === null) {
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const channelName = "discover:matches";

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.discoverPrefix });
    }, 300);

    void (async () => {
      await applyRealtimeAuth(accessToken);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matches",
          },
          () => debouncedInvalidate(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_participants",
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
