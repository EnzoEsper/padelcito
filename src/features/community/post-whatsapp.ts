import { formatPostEventSchedule } from '@/features/community/post-display';

export type PostWhatsAppContext = {
  title: string;
  venue_name: string | null;
  type: 'tournament' | 'training';
  event_start: string | null;
  event_end: string | null;
};

function resolveVenueLabel(post: PostWhatsAppContext): string {
  const venue = post.venue_name?.trim();
  if (venue !== undefined && venue.length > 0) return venue;
  return post.title.trim();
}

function eventTypeLabel(type: PostWhatsAppContext['type']): string {
  return type === 'tournament' ? 'tournament' : 'training session';
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

  return `Hi! I saw your ${kind} post for ${venue} (${schedule}) on Padelcito. I'd like more details — is it still open?`;
}

export function buildPostWhatsAppUrl(
  contactPhone: string,
  post: PostWhatsAppContext,
): string {
  const baseLink = buildPostWhatsAppBaseLink(contactPhone);
  const message = buildPostWhatsAppMessage(post);
  return buildWhatsAppLinkWithMessage(baseLink, message);
}
