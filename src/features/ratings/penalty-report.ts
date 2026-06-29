import type { Database } from '@/types/database';
import type { NotificationType } from '@/features/notifications/notification-display';

export type ReliabilityEventType = Database['public']['Enums']['reliability_event_type'];

export type PenaltyReportParams = {
  matchId: string;
  subjectId: string;
  type: ReliabilityEventType;
  participantId?: string;
};

export type PenaltyReportCopy = {
  screenTitle: string;
  eventTitle: string;
  eventDescription: string;
  reasonTags: readonly string[];
  submitLabel: string;
};

const PENALTY_COPY: Record<ReliabilityEventType, PenaltyReportCopy> = {
  late_withdrawal: {
    screenTitle: 'Report late withdrawal',
    eventTitle: 'Player left too close to start',
    eventDescription:
      'Confirm if this player abandoned the match within the penalty window. This is optional and helps protect other hosts.',
    reasonTags: ['No-show', 'Last-minute', 'No message', 'Repeated pattern'],
    submitLabel: 'Submit report',
  },
  host_removal: {
    screenTitle: 'Report late removal',
    eventTitle: 'Removed too close to start',
    eventDescription:
      'Confirm if the host removed you within the penalty window without a fair reason. This is optional.',
    reasonTags: ['Removed too late', 'No reason given', 'Unfair removal', 'Lost my spot'],
    submitLabel: 'Submit report',
  },
  late_cancellation: {
    screenTitle: 'Report late cancellation',
    eventTitle: 'Match cancelled too close to start',
    eventDescription:
      'Confirm if the host cancelled within the penalty window. This is optional and helps the community.',
    reasonTags: ['Cancelled too late', 'No reason given', 'Already committed', 'Wasted my time'],
    submitLabel: 'Submit report',
  },
};

export function getPenaltyReportCopy(type: ReliabilityEventType): PenaltyReportCopy {
  return PENALTY_COPY[type];
}

export function notificationTypeToReliabilityEvent(
  notificationType: NotificationType,
): ReliabilityEventType | null {
  switch (notificationType) {
    case 'participant_withdrawn':
      return 'late_withdrawal';
    case 'participant_removed':
      return 'host_removal';
    case 'match_cancelled':
      return 'late_cancellation';
    default:
      return null;
  }
}

export function buildReportPenaltyRoute(params: PenaltyReportParams): string {
  const search = new URLSearchParams({
    matchId: params.matchId,
    subjectId: params.subjectId,
    type: params.type,
  });

  if (params.participantId !== undefined && params.participantId.length > 0) {
    search.set('participantId', params.participantId);
  }

  return `/(app)/report-penalty?${search.toString()}`;
}

export function parseReliabilityEventType(value: string | undefined): ReliabilityEventType | null {
  if (value === 'late_withdrawal' || value === 'host_removal' || value === 'late_cancellation') {
    return value;
  }
  return null;
}

export const MIN_RELIABILITY_COMMITMENTS = 3;

export function hasPublicReliabilitySample(commitmentCount: number): boolean {
  return commitmentCount >= MIN_RELIABILITY_COMMITMENTS;
}

export function formatReliabilityScore(
  score: number | null,
  commitmentCount: number,
): string {
  if (!hasPublicReliabilitySample(commitmentCount) || score === null) {
    return 'New';
  }
  return `${Math.round(score)}%`;
}

export function formatPublicReliabilityScore(
  score: number | null,
  penaltyCount: number | null = 0,
): string | null {
  if (score !== null) {
    return `${Math.round(score)}% reliable`;
  }
  return null;
}

export function isLowReliability(
  score: number | null,
  penaltyCount: number,
  commitmentCount: number,
): boolean {
  if (penaltyCount > 0) return true;
  if (!hasPublicReliabilitySample(commitmentCount) || score === null) return false;
  return score < 85;
}
