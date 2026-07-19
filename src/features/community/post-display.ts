import type { Database } from '@/types/database';

export type CommunityPostType = Database['public']['Enums']['community_post_type'];
export type CommunityPostStatus = Database['public']['Enums']['community_post_status'];
export type CommunityPostReportReason = Database['public']['Enums']['community_post_report_reason'];
export type UserRole = Database['public']['Enums']['user_role'];

export const POST_DISCOVERY_RADIUS_M = 50_000;

export const POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  tournament: 'Tournament',
  training: 'Training',
};

export const POST_STATUS_LABELS: Record<CommunityPostStatus, string> = {
  pending_review: 'Pending review',
  approved: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const POST_STATUS_COLORS: Record<CommunityPostStatus, { bg: string; fg: string }> = {
  pending_review: { bg: 'rgba(224,177,91,0.18)', fg: '#E0B15B' },
  approved: { bg: 'rgba(91,224,166,0.14)', fg: '#5BE0A6' },
  rejected: { bg: 'rgba(224,91,91,0.14)', fg: '#E05B5B' },
  archived: { bg: '#232429', fg: 'rgba(228,228,228,0.38)' },
};

export const POST_REPORT_REASON_LABELS: Record<CommunityPostReportReason, string> = {
  spam: 'Spam',
  inappropriate: 'Inappropriate content',
  scam: 'Scam or fraud',
  misleading: 'Misleading information',
  other: 'Other',
};

export function formatPostDistanceKm(distanceM: number | undefined): string | null {
  if (distanceM === undefined) return null;
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  const km = distanceM / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatPostEventSchedule(
  eventStart: string | null,
  eventEnd: string | null,
): string {
  if (eventStart === null) return 'Date TBD';

  const start = new Date(eventStart);
  const startLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(start);

  if (eventEnd === null) return startLabel;

  const end = new Date(eventEnd);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const endLabel = new Intl.DateTimeFormat(undefined, {
    hour: sameDay ? undefined : '2-digit',
    minute: '2-digit',
    month: sameDay ? undefined : 'short',
    day: sameDay ? undefined : 'numeric',
    hourCycle: 'h23',
  }).format(end);

  return sameDay ? `${startLabel} – ${endLabel}` : `${startLabel} – ${endLabel}`;
}

export function isPostContactVerified(contactVerifiedAt: string | null): boolean {
  return contactVerifiedAt !== null;
}

export function buildPostDetailRoute(postId: string): string {
  return `/(app)/post-detail?id=${postId}`;
}

export function buildCreatePostRoute(): string {
  return `/(app)/create-post?fresh=${Date.now()}`;
}

export function buildModerationRoute(): string {
  return '/(app)/moderation';
}

export function buildMyPostsRoute(): string {
  return '/(app)/my-posts';
}
