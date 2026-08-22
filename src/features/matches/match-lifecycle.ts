import type { Database } from '@/types/database';

type ParticipantRow = Database['public']['Tables']['match_participants']['Row'];

export type MatchScheduleFields = {
  starts_at: string;
  status: Database['public']['Enums']['match_status'];
};

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
