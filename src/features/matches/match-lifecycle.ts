import type { Database } from '@/types/database';

type ParticipantRow = Database['public']['Tables']['match_participants']['Row'];

type MatchStatus = Database['public']['Enums']['match_status'];

export type MatchScheduleFields = {
  starts_at: string;
  status: MatchStatus;
};

export type MatchLifecycleFields = MatchScheduleFields & {
  duration_minutes: number;
};

export function matchEndsAtMs(match: MatchScheduleFields & { duration_minutes: number }): number {
  return new Date(match.starts_at).getTime() + match.duration_minutes * 60 * 1000;
}

/**
 * Display-only lifecycle aligned with `sync_match_lifecycle` — does not write to the database.
 */
export function resolveEffectiveMatchStatus(
  match: MatchLifecycleFields,
  nowMs: number = Date.now(),
): MatchStatus {
  if (match.status === 'cancelled') {
    return 'cancelled';
  }

  const startMs = new Date(match.starts_at).getTime();
  const endsAtMs = matchEndsAtMs(match);

  if (match.status === 'open' || match.status === 'full') {
    if (endsAtMs <= nowMs) {
      return 'finished';
    }
    if (startMs <= nowMs) {
      return 'in_progress';
    }
    return match.status;
  }

  if (match.status === 'in_progress' && endsAtMs <= nowMs) {
    return 'finished';
  }

  return match.status;
}

export function isEffectiveMatchPreStart(
  match: MatchLifecycleFields,
  nowMs: number = Date.now(),
): boolean {
  const effective = resolveEffectiveMatchStatus(match, nowMs);
  return effective === 'open' || effective === 'full';
}

export type MatchHostRosterFields = MatchScheduleFields & {
  isHost: boolean;
  appAcceptedCount: number;
};

export type MatchWithdrawFields = MatchScheduleFields & {
  isHost: boolean;
  currentUserParticipant: ParticipantRow | null;
};

export function isMatchPreStart(
  match: MatchScheduleFields,
  nowMs: number = Date.now(),
): boolean {
  return (
    (match.status === 'open' || match.status === 'full') &&
    new Date(match.starts_at).getTime() > nowMs
  );
}

export function canHostEditRoster(
  match: MatchScheduleFields & { isHost: boolean },
  nowMs: number = Date.now(),
): boolean {
  return match.isHost && isMatchPreStart(match, nowMs);
}

export function canHostManageRoster(
  match: MatchHostRosterFields,
  nowMs: number = Date.now(),
): boolean {
  return canHostEditRoster(match, nowMs) && match.appAcceptedCount > 0;
}

export function canHostCancelMatch(
  match: MatchScheduleFields,
  nowMs: number = Date.now(),
): boolean {
  return isMatchPreStart(match, nowMs);
}

export function canPlayerWithdraw(
  match: MatchWithdrawFields,
  nowMs: number = Date.now(),
): boolean {
  return (
    !match.isHost &&
    match.status !== 'cancelled' &&
    match.currentUserParticipant?.status === 'accepted' &&
    isMatchPreStart(match, nowMs)
  );
}
