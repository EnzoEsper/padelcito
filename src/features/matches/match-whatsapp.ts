import { formatMatchScheduleLabel } from '@/lib/match-time';

export type MatchWhatsAppContext = {
  venue_name: string | null;
  title: string;
  starts_at: string;
  duration_minutes: number;
};

function resolveMatchVenueLabel(match: MatchWhatsAppContext): string {
  const venue = match.venue_name?.trim();
  if (venue !== undefined && venue.length > 0) return venue;
  return match.title.trim();
}

function firstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) return 'there';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function buildMatchSchedulePhrase(match: MatchWhatsAppContext): string {
  return formatMatchScheduleLabel(match.starts_at, match.duration_minutes);
}

/** Appends a pre-filled message to a wa.me link returned by match_contact_details(). */
export function buildWhatsAppLinkWithMessage(baseLink: string, message: string): string {
  const separator = baseLink.includes('?') ? '&' : '?';
  return `${baseLink}${separator}text=${encodeURIComponent(message)}`;
}

/** Host messaging an accepted player from the roster. */
export function buildHostToPlayerWhatsAppMessage(
  match: MatchWhatsAppContext,
  recipientDisplayName: string,
): string {
  const venue = resolveMatchVenueLabel(match);
  const schedule = buildMatchSchedulePhrase(match);
  const name = firstName(recipientDisplayName);

  return `Hi ${name}! I'm hosting the padel match at ${venue} (${schedule}). Just reaching out to coordinate — reply here if you have any questions!`;
}

/** Accepted player messaging the host from the footer CTA. */
export function buildPlayerToHostWhatsAppMessage(
  match: MatchWhatsAppContext,
  hostDisplayName: string,
): string {
  const venue = resolveMatchVenueLabel(match);
  const schedule = buildMatchSchedulePhrase(match);
  const name = firstName(hostDisplayName);

  return `Hi ${name}! I'm confirmed for the padel match at ${venue} (${schedule}). Wanted to connect — let me know if there's anything I should know before we play!`;
}
