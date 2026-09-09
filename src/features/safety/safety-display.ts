import type { Database } from '@/types/database';

export type UserReportReason = Database['public']['Enums']['user_report_reason'];

export const USER_REPORT_REASONS: UserReportReason[] = [
  'harassment',
  'inappropriate',
  'spam',
  'scam',
  'safety',
  'other',
];

export const USER_REPORT_REASON_LABELS: Record<UserReportReason, string> = {
  harassment: 'Harassment or bullying',
  inappropriate: 'Inappropriate behavior',
  spam: 'Spam',
  scam: 'Scam or fraud',
  safety: 'Safety concern',
  other: 'Other',
};

export function buildUserReportsRoute(): string {
  return '/(app)/user-reports';
}

export function formatReportRelativeTime(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return 'Recently';
  }

  const diffMs = timestamp - Date.now();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSeconds < 60) {
    return rtf.format(Math.round(diffMs / 1000), 'second');
  }

  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) {
    return rtf.format(Math.round(diffMs / (1000 * 60)), 'minute');
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return rtf.format(Math.round(diffMs / (1000 * 60 * 60)), 'hour');
  }

  const absDays = Math.round(absHours / 24);
  if (absDays < 7) {
    return rtf.format(Math.round(diffMs / (1000 * 60 * 60 * 24)), 'day');
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function buildMatchContextRoute(matchId: string): string {
  return `/(app)/match-detail?id=${matchId}`;
}

export function buildPostContextRoute(postId: string): string {
  return `/(app)/post-detail?id=${postId}`;
}
