import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

type JsonRecord = Record<string, unknown>;

type NotificationType =
  | "join_request"
  | "join_accepted"
  | "join_rejected"
  | "join_request_cancelled"
  | "participant_withdrawn"
  | "participant_removed"
  | "match_cancelled"
  | "rating_request"
  | "community_post_submitted"
  | "community_post_approved"
  | "community_post_rejected";

type NotificationRecord = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  match_id: string | null;
  participant_id: string | null;
  community_post_id: string | null;
  data: JsonRecord;
  read_at: string | null;
  created_at: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: NotificationRecord;
};

type NotificationData = {
  match_title?: string;
  venue_name?: string | null;
  actor_name?: string;
  was_late_withdrawal?: boolean;
  was_removed_by_host?: boolean;
  was_late_cancellation?: boolean;
  post_title?: string;
  rejection_reason?: string | null;
};

type PushCopy = {
  title: string;
  body: string;
  route: string | null;
};

type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: { route: string | null; notificationId: string };
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseNotificationData(data: JsonRecord): NotificationData {
  return {
    match_title: typeof data.match_title === "string" ? data.match_title : undefined,
    venue_name:
      typeof data.venue_name === "string" || data.venue_name === null
        ? data.venue_name
        : undefined,
    actor_name: typeof data.actor_name === "string" ? data.actor_name : undefined,
    was_late_withdrawal:
      typeof data.was_late_withdrawal === "boolean" ? data.was_late_withdrawal : undefined,
    was_removed_by_host:
      typeof data.was_removed_by_host === "boolean" ? data.was_removed_by_host : undefined,
    was_late_cancellation:
      typeof data.was_late_cancellation === "boolean" ? data.was_late_cancellation : undefined,
    post_title: typeof data.post_title === "string" ? data.post_title : undefined,
    rejection_reason:
      typeof data.rejection_reason === "string" || data.rejection_reason === null
        ? data.rejection_reason
        : undefined,
  };
}

function matchLabel(data: NotificationData): string {
  return data.venue_name ?? data.match_title ?? "your match";
}

function postLabel(data: NotificationData): string {
  return data.venue_name ?? data.post_title ?? "your post";
}

function actorName(data: NotificationData): string {
  return data.actor_name ?? "Someone";
}

function matchDetailRoute(matchId: string | null): string | null {
  return matchId !== null ? `/(app)/match-detail?id=${matchId}` : null;
}

function postDetailRoute(postId: string | null): string | null {
  return postId !== null ? `/(app)/post-detail?id=${postId}` : null;
}

function buildRateMatchRoute(matchId: string): string {
  return `/(app)/rate-match?matchId=${encodeURIComponent(matchId)}`;
}

function buildModerationRoute(): string {
  return "/(app)/moderation";
}

function notificationTypeToReliabilityEvent(
  notificationType: NotificationType,
): "late_withdrawal" | "host_removal" | "late_cancellation" | null {
  switch (notificationType) {
    case "participant_withdrawn":
      return "late_withdrawal";
    case "participant_removed":
      return "host_removal";
    case "match_cancelled":
      return "late_cancellation";
    default:
      return null;
  }
}

function isPenaltyEligibleNotification(record: NotificationRecord, data: NotificationData): boolean {
  const reliabilityType = notificationTypeToReliabilityEvent(record.type);

  if (reliabilityType === null || record.match_id === null || record.actor_id === null) {
    return false;
  }

  switch (record.type) {
    case "participant_withdrawn":
      return data.was_late_withdrawal === true;
    case "participant_removed":
      return data.was_removed_by_host === true;
    case "match_cancelled":
      return data.was_late_cancellation === true;
    default:
      return false;
  }
}

function buildReportPenaltyRoute(record: NotificationRecord): string | null {
  const reliabilityType = notificationTypeToReliabilityEvent(record.type);
  if (
    reliabilityType === null ||
    record.match_id === null ||
    record.actor_id === null
  ) {
    return null;
  }

  const search = new URLSearchParams({
    matchId: record.match_id,
    subjectId: record.actor_id,
    type: reliabilityType,
  });

  if (record.participant_id !== null && record.participant_id.length > 0) {
    search.set("participantId", record.participant_id);
  }

  return `/(app)/report-penalty?${search.toString()}`;
}

function resolvePushCopy(record: NotificationRecord): PushCopy {
  const data = parseNotificationData(record.data);
  const label = matchLabel(data);
  const actor = actorName(data);
  const penaltyEligible = isPenaltyEligibleNotification(record, data);
  const penaltyRoute = penaltyEligible ? buildReportPenaltyRoute(record) : null;
  const fallbackRoute =
    record.community_post_id !== null
      ? postDetailRoute(record.community_post_id)
      : matchDetailRoute(record.match_id);
  const route = penaltyRoute ?? fallbackRoute;

  switch (record.type) {
    case "join_request":
      return {
        title: "Join request",
        body: `${actor} requested to join ${label}.`,
        route,
      };
    case "join_accepted":
      return {
        title: "You're in",
        body: `${actor} accepted your request for ${label}.`,
        route,
      };
    case "join_rejected":
      return {
        title: "Request declined",
        body: `${actor} declined your request for ${label}.`,
        route,
      };
    case "join_request_cancelled":
      return {
        title: "Request cancelled",
        body: `${actor} cancelled their join request for ${label}.`,
        route,
      };
    case "participant_withdrawn":
      return {
        title: "Player left",
        body:
          data.was_late_withdrawal === true
            ? `${actor} withdrew late from ${label}. You can optionally report this.`
            : `${actor} left ${label}.`,
        route,
      };
    case "participant_removed":
      return {
        title: "Removed from match",
        body:
          data.was_removed_by_host === true
            ? `${actor} removed you late from ${label}. You can optionally report this.`
            : `${actor} removed you from ${label}.`,
        route,
      };
    case "match_cancelled":
      return {
        title: "Match cancelled",
        body:
          data.was_late_cancellation === true
            ? `${actor} cancelled ${label} too close to start. You can optionally report this.`
            : `${actor} cancelled ${label}.`,
        route,
      };
    case "rating_request":
      return {
        title: "Rate your match",
        body: `How was ${label}? Share optional quality feedback with your co-players.`,
        route:
          record.match_id !== null ? buildRateMatchRoute(record.match_id) : fallbackRoute,
      };
    case "community_post_approved":
      return {
        title: "Post approved",
        body: `Your post for ${postLabel(data)} is now public on Community.`,
        route: postDetailRoute(record.community_post_id),
      };
    case "community_post_rejected":
      return {
        title: "Post rejected",
        body:
          data.rejection_reason !== undefined && data.rejection_reason !== null
            ? `Your post for ${postLabel(data)} was rejected: ${data.rejection_reason}`
            : `Your post for ${postLabel(data)} was rejected. You can edit and resubmit.`,
        route: postDetailRoute(record.community_post_id),
      };
    case "community_post_submitted":
      return {
        title: "Post to review",
        body: `${actor} submitted a post for ${postLabel(data)}.`,
        route: buildModerationRoute(),
      };
    default: {
      const _exhaustive: never = record.type;
      return {
        title: "Notification",
        body: String(_exhaustive),
        route,
      };
    }
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function sendExpoPushMessages(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (EXPO_ACCESS_TOKEN !== undefined && EXPO_ACCESS_TOKEN.length > 0) {
    headers.Authorization = `Bearer ${EXPO_ACCESS_TOKEN}`;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(messages),
  });

  const payload = (await response.json()) as { data?: ExpoPushTicket[]; errors?: unknown[] };

  if (!response.ok) {
    throw new Error(`Expo push API failed (${response.status})`);
  }

  return Array.isArray(payload.data) ? payload.data : [];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !PUSH_WEBHOOK_SECRET
  ) {
    return jsonResponse({ error: "Push delivery is not configured." }, 503);
  }

  const webhookSecret = req.headers.get("x-push-webhook-secret");
  if (webhookSecret === null || webhookSecret !== PUSH_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  if (payload.type !== "INSERT" || payload.table !== "notifications") {
    return jsonResponse({ skipped: true, reason: "Unsupported webhook event." });
  }

  const record = payload.record;
  if (record.recipient_id.length === 0) {
    return jsonResponse({ skipped: true, reason: "Missing recipient." });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: tokens, error: tokensError } = await supabaseAdmin
    .from("push_tokens")
    .select("id, expo_push_token")
    .eq("user_id", record.recipient_id)
    .eq("enabled", true);

  if (tokensError !== null) {
    console.error("push_tokens query failed", tokensError.message);
    return jsonResponse({ error: "Could not load push tokens." }, 503);
  }

  if (tokens === null || tokens.length === 0) {
    return jsonResponse({ skipped: true, reason: "No registered devices." });
  }

  const copy = resolvePushCopy(record);
  const deliveries = tokens.map((tokenRow) => ({
    tokenId: tokenRow.id,
    message: {
      to: tokenRow.expo_push_token,
      sound: "default" as const,
      title: copy.title,
      body: copy.body,
      data: {
        route: copy.route,
        notificationId: record.id,
      },
    },
  }));

  const staleTokenIds: string[] = [];
  let delivered = 0;

  for (const chunk of chunkArray(deliveries, EXPO_PUSH_CHUNK_SIZE)) {
    try {
      const tickets = await sendExpoPushMessages(chunk.map((entry) => entry.message));
      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i];
        const entry = chunk[i];
        if (entry === undefined) continue;

        if (ticket.status === "ok") {
          delivered += 1;
          continue;
        }

        if (ticket.details?.error === "DeviceNotRegistered") {
          staleTokenIds.push(entry.tokenId);
        } else if (ticket.message !== undefined) {
          console.warn("Expo push ticket error", ticket.message, entry.message.to);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Expo push error";
      console.error("Expo push chunk failed", message);
      return jsonResponse({ error: message }, 502);
    }
  }

  if (staleTokenIds.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from("push_tokens")
      .delete()
      .in("id", staleTokenIds);

    if (deleteError !== null) {
      console.warn("Failed to prune stale push tokens", deleteError.message);
    }
  }

  return jsonResponse({
    delivered,
    pruned: staleTokenIds.length,
    devices: tokens.length,
  });
});
