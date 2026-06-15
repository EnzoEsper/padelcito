import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

export function useMatchRealtime(matchId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (matchId === null || matchId.length === 0) {
      return;
    }

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      void queryClient.invalidateQueries({
        queryKey: matchKeys.detail(matchId),
      });
    }, 300);

    const channel = supabase
      .channel(`match:${matchId}`)
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);
}

export function useMyMatchesRealtime(userId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userId === null || userId.length === 0) {
      return;
    }

    const debouncedInvalidate = createDebouncedInvalidator(() => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.mine });
    }, 300);

    const channel = supabase
      .channel(`my-matches:${userId}`)
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
