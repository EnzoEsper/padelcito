import { formatFlyerEventSchedule } from '@/features/community/flyer-display';

export type FlyerWhatsAppContext = {
  title: string;
  venue_name: string | null;
  type: 'tournament' | 'training';
  event_start: string | null;
  event_end: string | null;
};

function resolveVenueLabel(flyer: FlyerWhatsAppContext): string {
  const venue = flyer.venue_name?.trim();
  if (venue !== undefined && venue.length > 0) return venue;
  return flyer.title.trim();
}

function eventTypeLabel(type: FlyerWhatsAppContext['type']): string {
  return type === 'tournament' ? 'tournament' : 'training session';
}

/** Appends a pre-filled message to a wa.me link built from the flyer's public contact phone. */
export function buildWhatsAppLinkWithMessage(baseLink: string, message: string): string {
  const separator = baseLink.includes('?') ? '&' : '?';
  return `${baseLink}${separator}text=${encodeURIComponent(message)}`;
}

export function buildFlyerWhatsAppBaseLink(contactPhone: string): string {
  const digits = contactPhone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export function buildFlyerWhatsAppMessage(flyer: FlyerWhatsAppContext): string {
  const venue = resolveVenueLabel(flyer);
  const schedule = formatFlyerEventSchedule(flyer.event_start, flyer.event_end);
  const kind = eventTypeLabel(flyer.type);

  return `Hi! I saw your ${kind} flyer for ${venue} (${schedule}) on Padelcito. I'd like more details — is it still open?`;
}

export function buildFlyerWhatsAppUrl(
  contactPhone: string,
  flyer: FlyerWhatsAppContext,
): string {
  const baseLink = buildFlyerWhatsAppBaseLink(contactPhone);
  const message = buildFlyerWhatsAppMessage(flyer);
  return buildWhatsAppLinkWithMessage(baseLink, message);
}
