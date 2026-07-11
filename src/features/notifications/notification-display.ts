import type { Ionicons } from '@expo/vector-icons';
import type { Database } from '@/types/database';
import {
  buildReportPenaltyRoute,
  notificationTypeToReliabilityEvent,
  type ReliabilityEventType,
} from '@/features/ratings/penalty-report';
import { buildRateMatchRoute } from '@/features/ratings/rating-display';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationType = Database['public']['Enums']['notification_type'];

export type NotificationData = {
  match_title?: string;
  venue_name?: string | null;
  actor_name?: string;
  was_late_withdrawal?: boolean;
  was_removed_by_host?: boolean;
  was_late_cancellation?: boolean;
  flyer_title?: string;
  rejection_reason?: string | null;
};

export type NotificationPresentation = {
  icon: keyof typeof Ionicons.glyphMap;
  accent: 'primary' | 'success' | 'warning';
  title: string;
  body: string;
  route: string | null;
  penaltyEligible: boolean;
  actionLabel: string | null;
};

export function parseNotificationData(data: NotificationRow['data']): NotificationData {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }
  const record = data as Record<string, unknown>;
  return {
    match_title: typeof record.match_title === 'string' ? record.match_title : undefined,
    venue_name:
      typeof record.venue_name === 'string' || record.venue_name === null
        ? record.venue_name
        : undefined,
    actor_name: typeof record.actor_name === 'string' ? record.actor_name : undefined,
    was_late_withdrawal:
      typeof record.was_late_withdrawal === 'boolean' ? record.was_late_withdrawal : undefined,
    was_removed_by_host:
      typeof record.was_removed_by_host === 'boolean' ? record.was_removed_by_host : undefined,
    was_late_cancellation:
      typeof record.was_late_cancellation === 'boolean'
        ? record.was_late_cancellation
        : undefined,
    flyer_title: typeof record.flyer_title === 'string' ? record.flyer_title : undefined,
    rejection_reason:
      typeof record.rejection_reason === 'string' || record.rejection_reason === null
        ? record.rejection_reason
        : undefined,
  };
}

function matchLabel(data: NotificationData): string {
  return data.venue_name ?? data.match_title ?? 'your match';
}

function actorName(data: NotificationData): string {
  return data.actor_name ?? 'Someone';
}

function matchDetailRoute(matchId: string | null): string | null {
  return matchId !== null ? `/(app)/match-detail?id=${matchId}` : null;
}

function flyerDetailRoute(flyerId: string | null): string | null {
  return flyerId !== null ? `/(app)/flyer-detail?id=${flyerId}` : null;
}

function flyerLabel(data: NotificationData): string {
  return data.venue_name ?? data.flyer_title ?? 'your flyer';
}

export function isPenaltyEligibleNotification(notification: NotificationRow): boolean {
  const data = parseNotificationData(notification.data);
  const reliabilityType = notificationTypeToReliabilityEvent(notification.type);

  if (reliabilityType === null || notification.match_id === null || notification.actor_id === null) {
    return false;
  }

  switch (notification.type) {
    case 'participant_withdrawn':
      return data.was_late_withdrawal === true;
    case 'participant_removed':
      return data.was_removed_by_host === true;
    case 'match_cancelled':
      return data.was_late_cancellation === true;
    default:
      return false;
  }
}

export function resolvePenaltyReportRoute(notification: NotificationRow): string | null {
  if (!isPenaltyEligibleNotification(notification)) {
    return null;
  }

  const reliabilityType = notificationTypeToReliabilityEvent(notification.type);
  if (
    reliabilityType === null ||
    notification.match_id === null ||
    notification.actor_id === null
  ) {
    return null;
  }

  return buildReportPenaltyRoute({
    matchId: notification.match_id,
    subjectId: notification.actor_id,
    type: reliabilityType,
    participantId: notification.participant_id ?? undefined,
  });
}

export function resolveNotificationPresentation(
  notification: NotificationRow,
): NotificationPresentation {
  const data = parseNotificationData(notification.data);
  const label = matchLabel(data);
  const actor = actorName(data);
  const penaltyEligible = isPenaltyEligibleNotification(notification);
  const penaltyRoute = resolvePenaltyReportRoute(notification);
  const fallbackRoute =
    notification.flyer_id !== null
      ? flyerDetailRoute(notification.flyer_id)
      : matchDetailRoute(notification.match_id);
  const route = penaltyRoute ?? fallbackRoute;

  const base = {
    route,
    penaltyEligible,
    actionLabel: penaltyEligible ? 'Report' : null,
  };

  switch (notification.type) {
    case 'join_request':
      return {
        ...base,
        icon: 'person-add-outline',
        accent: 'primary',
        title: 'Join request',
        body: `${actor} requested to join ${label}.`,
      };
    case 'join_accepted':
      return {
        ...base,
        icon: 'checkmark-circle-outline',
        accent: 'success',
        title: "You're in",
        body: `${actor} accepted your request for ${label}.`,
      };
    case 'join_rejected':
      return {
        ...base,
        icon: 'close-circle-outline',
        accent: 'warning',
        title: 'Request declined',
        body: `${actor} declined your request for ${label}.`,
      };
    case 'join_request_cancelled':
      return {
        ...base,
        icon: 'close-circle-outline',
        accent: 'primary',
        title: 'Request cancelled',
        body: `${actor} cancelled their join request for ${label}.`,
      };
    case 'participant_withdrawn':
      return {
        ...base,
        icon: 'exit-outline',
        accent: data.was_late_withdrawal === true ? 'warning' : 'primary',
        title: 'Player left',
        body:
          data.was_late_withdrawal === true
            ? `${actor} withdrew late from ${label}. You can optionally report this.`
            : `${actor} left ${label}.`,
      };
    case 'participant_removed':
      return {
        ...base,
        icon: 'remove-circle-outline',
        accent: data.was_removed_by_host === true ? 'warning' : 'primary',
        title: 'Removed from match',
        body:
          data.was_removed_by_host === true
            ? `${actor} removed you late from ${label}. You can optionally report this.`
            : `${actor} removed you from ${label}.`,
      };
    case 'match_cancelled':
      return {
        ...base,
        icon: 'ban-outline',
        accent: 'warning',
        title: 'Match cancelled',
        body:
          data.was_late_cancellation === true
            ? `${actor} cancelled ${label} too close to start. You can optionally report this.`
            : `${actor} cancelled ${label}.`,
      };
    case 'rating_request':
      return {
        ...base,
        icon: 'star-outline',
        accent: 'primary',
        title: 'Rate your match',
        body: `How was ${label}? Share optional quality feedback with your co-players.`,
        route:
          notification.match_id !== null
            ? buildRateMatchRoute(notification.match_id)
            : fallbackRoute,
        actionLabel: 'Rate',
      };
    case 'flyer_approved':
      return {
        ...base,
        icon: 'checkmark-circle-outline',
        accent: 'success',
        title: 'Flyer approved',
        body: `Your flyer for ${flyerLabel(data)} is now public on Community.`,
        route: flyerDetailRoute(notification.flyer_id),
        actionLabel: 'View',
      };
    case 'flyer_rejected':
      return {
        ...base,
        icon: 'close-circle-outline',
        accent: 'warning',
        title: 'Flyer rejected',
        body:
          data.rejection_reason !== undefined && data.rejection_reason !== null
            ? `Your flyer for ${flyerLabel(data)} was rejected: ${data.rejection_reason}`
            : `Your flyer for ${flyerLabel(data)} was rejected. You can edit and resubmit.`,
        route: flyerDetailRoute(notification.flyer_id),
        actionLabel: 'Review',
      };
    default: {
      const _exhaustive: never = notification.type;
      return {
        ...base,
        icon: 'notifications-outline',
        accent: 'primary',
        title: 'Notification',
        body: String(_exhaustive),
      };
    }
  }
}

export function isNotificationUnread(notification: NotificationRow): boolean {
  return notification.read_at === null;
}

export function groupNotificationsByDay(
  notifications: NotificationRow[],
  now: Date = new Date(),
): { label: string; items: NotificationRow[] }[] {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const today: NotificationRow[] = [];
  const earlier: NotificationRow[] = [];

  for (const notification of notifications) {
    const created = new Date(notification.created_at);
    if (created >= todayStart) {
      today.push(notification);
    } else {
      earlier.push(notification);
    }
  }

  const groups: { label: string; items: NotificationRow[] }[] = [];
  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (earlier.length > 0) groups.push({ label: 'Earlier', items: earlier });
  return groups;
}

export function formatNotificationTime(createdAt: string, now: Date = new Date()): string {
  const date = new Date(createdAt);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (date >= todayStart) {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export type { ReliabilityEventType };
