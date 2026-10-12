import type { Database } from '@/types/database';

type MatchStatus = Database['public']['Enums']['match_status'];
type ParticipantStatus = Database['public']['Enums']['participant_status'];

export type MatchStatusBadgeTone = 'open' | 'full' | 'live' | 'finished' | 'cancelled';

export type MatchStatusBadgeConfig = {
  label: string;
  tone: MatchStatusBadgeTone;
};

export type ParticipantStatusMembershipTone = 'pending' | 'accepted' | 'inactive';

export type ParticipantStatusDisplay = {
  label: string;
  tone: ParticipantStatusMembershipTone;
  pulse: boolean;
};

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  open: 'Open',
  full: 'Full',
  in_progress: 'Live',
  finished: 'Finished',
  cancelled: 'Cancelled',
};

export function resolveMatchStatusBadge(status: MatchStatus): MatchStatusBadgeConfig {
  switch (status) {
    case 'open':
      return { label: MATCH_STATUS_LABELS.open, tone: 'open' };
    case 'full':
      return { label: MATCH_STATUS_LABELS.full, tone: 'full' };
    case 'in_progress':
      return { label: MATCH_STATUS_LABELS.in_progress, tone: 'live' };
    case 'finished':
      return { label: MATCH_STATUS_LABELS.finished, tone: 'finished' };
    case 'cancelled':
      return { label: MATCH_STATUS_LABELS.cancelled, tone: 'cancelled' };
  }
}

const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  removed: 'Removed',
  cancelled: 'Cancelled',
};

/** Card/footer label for match_participants.status — mirrors participant_status enum. */
export function resolveParticipantStatusDisplay(
  status: ParticipantStatus,
): ParticipantStatusDisplay {
  switch (status) {
    case 'pending':
      return {
        label: PARTICIPANT_STATUS_LABELS.pending,
        tone: 'pending',
        pulse: true,
      };
    case 'accepted':
      return {
        label: 'Confirmed',
        tone: 'accepted',
        pulse: false,
      };
    case 'rejected':
    case 'withdrawn':
    case 'removed':
    case 'cancelled':
      return {
        label: PARTICIPANT_STATUS_LABELS[status],
        tone: 'inactive',
        pulse: false,
      };
  }
}
