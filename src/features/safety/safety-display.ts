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
