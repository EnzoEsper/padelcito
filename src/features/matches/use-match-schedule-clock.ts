import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { matchKeys } from '@/features/matches/use-matches';

const TICK_MS = 30_000;

export function useMatchScheduleClock(
  matchId: string | null,
  startsAt: string | null | undefined,
  durationMinutes: number | null | undefined,
): number {
  const queryClient = useQueryClient();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (
      matchId === null ||
      matchId.length === 0 ||
      startsAt === null ||
      startsAt === undefined ||
      durationMinutes === null ||
      durationMinutes === undefined
    ) {
      return;
    }

    const startMs = new Date(startsAt).getTime();
    const endMs = startMs + durationMinutes * 60_000;

    const activeMatchId = matchId;

    function bumpClock(): void {
      setNowMs(Date.now());
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(activeMatchId) });
    }

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, TICK_MS);

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function scheduleBoundary(targetMs: number): void {
      const delay = targetMs - Date.now();
      if (delay <= 0) {
        return;
      }
      timeouts.push(setTimeout(bumpClock, delay));
    }

    scheduleBoundary(startMs);
    scheduleBoundary(endMs);

    return () => {
      clearInterval(intervalId);
      for (const timeoutId of timeouts) {
        clearTimeout(timeoutId);
      }
    };
  }, [matchId, startsAt, durationMinutes, queryClient]);

  return nowMs;
}
