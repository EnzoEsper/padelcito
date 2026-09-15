import type { Database } from "@/types/database";

export type UserReportReason =
  Database["public"]["Enums"]["user_report_reason"];

export const USER_REPORT_REASONS: UserReportReason[] = [
  "harassment",
  "inappropriate",
  "spam",
  "scam",
  "safety",
  "other",
];

export const USER_REPORT_REASON_LABELS: Record<UserReportReason, string> = {
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate behavior",
  spam: "Spam",
  scam: "Scam or fraud",
  safety: "Safety concern",
  other: "Other",
};

export function buildUserReportsRoute(): string {
  return "/(app)/user-reports";
}

export function buildModerationBannedUsersRoute(): string {
  return "/(app)/moderation-banned-users";
}

function formatPastRelativeTime(diffMs: number): string | null {
  const absSeconds = Math.max(1, Math.round(Math.abs(diffMs) / 1000));

  if (absSeconds < 60) {
    return absSeconds === 1 ? '1 second ago' : `${absSeconds} seconds ago`;
  }

  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) {
    return absMinutes === 1 ? '1 minute ago' : `${absMinutes} minutes ago`;
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return absHours === 1 ? '1 hour ago' : `${absHours} hours ago`;
  }

  const absDays = Math.round(absHours / 24);
  if (absDays < 7) {
    return absDays === 1 ? '1 day ago' : `${absDays} days ago`;
  }

  return null;
}

export function formatReportRelativeTime(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return 'Recently';
  }

  const date = new Date(timestamp);
  const diffMs = timestamp - Date.now();
  const relative = formatPastRelativeTime(diffMs);

  if (relative !== null) {
    return relative;
  }

  const month = date.toLocaleString('en', { month: 'short' });
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${hours}:${minutes}`;
}

export function buildMatchContextRoute(matchId: string): string {
  return `/(app)/match-detail?id=${matchId}`;
}

export function buildPostContextRoute(postId: string): string {
  return `/(app)/post-detail?id=${postId}`;
}

export type PlayerProfileRouteParams = {
  userId: string;
  matchId?: string;
  postId?: string;
};

export function buildPlayerProfileRoute(params: PlayerProfileRouteParams): string {
  const search = new URLSearchParams({ id: params.userId });
  if (params.matchId !== undefined && params.matchId.length > 0) {
    search.set('matchId', params.matchId);
  }
  if (params.postId !== undefined && params.postId.length > 0) {
    search.set('postId', params.postId);
  }
  return `/(app)/player-profile?${search.toString()}`;
}

/** Where to land after leaving player-profile (tabs flatten history; do not rely on router.back()). */
export function resolvePlayerProfileReturnRoute(context: {
  matchId?: string | null;
  postId?: string | null;
}): string {
  if (context.matchId !== null && context.matchId !== undefined && context.matchId.length > 0) {
    return buildMatchContextRoute(context.matchId);
  }
  if (context.postId !== null && context.postId !== undefined && context.postId.length > 0) {
    return buildPostContextRoute(context.postId);
  }
  return '/(app)/discover';
}
