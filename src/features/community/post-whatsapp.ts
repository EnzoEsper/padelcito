import {
  formatPostEventSchedule,
  POST_TYPE_LABELS,
  type CommunityPostType,
} from '@/features/community/post-display';

export type PostWhatsAppContext = {
  title: string;
  venue_name: string | null;
  type: CommunityPostType;
  event_start: string | null;
  event_end: string | null;
};

function resolveVenueLabel(post: PostWhatsAppContext): string {
  const venue = post.venue_name?.trim();
  if (venue !== undefined && venue.length > 0) return venue;
  return post.title.trim();
}

function eventTypeLabel(type: PostWhatsAppContext['type']): string {
  return POST_TYPE_LABELS[type].toLowerCase();
}

function contactIntentPhrase(type: PostWhatsAppContext['type']): string {
  switch (type) {
    case 'tournament':
      return 'register for the tournament';
    case 'league':
      return 'join the league';
    case 'training':
      return 'sign up for the training';
    case 'social':
      return 'join the event';
    case 'special_event':
      return 'get details about the event';
    default:
      return 'get more details';
  }
}

/** Appends a pre-filled message to a wa.me link built from the post's public contact phone. */
export function buildWhatsAppLinkWithMessage(baseLink: string, message: string): string {
  const separator = baseLink.includes('?') ? '&' : '?';
  return `${baseLink}${separator}text=${encodeURIComponent(message)}`;
}

export function buildPostWhatsAppBaseLink(contactPhone: string): string {
  const digits = contactPhone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export function buildPostWhatsAppMessage(post: PostWhatsAppContext): string {
  const venue = resolveVenueLabel(post);
  const schedule = formatPostEventSchedule(post.event_start, post.event_end);
  const kind = eventTypeLabel(post.type);
  const intent = contactIntentPhrase(post.type);

  return `Hi! I found your ${kind} "${post.title.trim()}" at ${venue} (${schedule}) on Padelcito. I'd like to ${intent} — is it still open?`;
}

export type OrganizerContactWhatsAppContext = {
  label: string | null;
};

export function buildOrganizerVerificationMessage(
  post: PostWhatsAppContext,
  contact: OrganizerContactWhatsAppContext,
): string {
  const venue = resolveVenueLabel(post);
  const schedule = formatPostEventSchedule(post.event_start, post.event_end);
  const kind = eventTypeLabel(post.type);
  const who =
    contact.label !== null && contact.label.trim().length > 0
      ? contact.label.trim()
      : 'organizer';

  return (
    `Hi${who.length > 0 ? ` ${who}` : ''}! This is Padelcito moderation. ` +
    `We received a ${kind} listing "${post.title.trim()}" at ${venue} (${schedule}). ` +
    `Can you confirm you are an organizer for this event? Reply here so we can approve the post. Thanks!`
  );
}

export function buildOrganizerVerificationUrl(
  contactPhone: string,
  post: PostWhatsAppContext,
  contact: OrganizerContactWhatsAppContext,
): string {
  const baseLink = buildPostWhatsAppBaseLink(contactPhone);
  const message = buildOrganizerVerificationMessage(post, contact);
  return buildWhatsAppLinkWithMessage(baseLink, message);
}

export function buildPostWhatsAppUrl(
  contactPhone: string,
  post: PostWhatsAppContext,
): string {
  const baseLink = buildPostWhatsAppBaseLink(contactPhone);
  const message = buildPostWhatsAppMessage(post);
  return buildWhatsAppLinkWithMessage(baseLink, message);
}
