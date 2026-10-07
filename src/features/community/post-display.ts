import { formatCategoryLabel } from '@/lib/padel-category';
import type { Database } from '@/types/database';

export type CommunityPostType = Database['public']['Enums']['community_post_type'];
export type CommunityPostSubtype = Database['public']['Enums']['community_post_subtype'];
export type CommunityPostTag = Database['public']['Enums']['community_post_tag'];
export type CommunityPostScoringFormat = Database['public']['Enums']['community_post_scoring_format'];
export type CommunityPostFeeUnit = Database['public']['Enums']['community_post_fee_unit'];
export type CommunityPostDivisionGender = Database['public']['Enums']['community_post_division_gender'];
export type CommunityPostStatus = Database['public']['Enums']['community_post_status'];
export type CommunityPostReportReason = Database['public']['Enums']['community_post_report_reason'];
export type UserRole = Database['public']['Enums']['user_role'];

export type CommunityPostDivisionRow = Database['public']['Tables']['community_post_divisions']['Row'];

export type CommunityPostDivisionInput = {
  gender: CommunityPostDivisionGender;
  category_min: number | null;
  category_max: number | null;
  category_sum: number | null;
  age_min: number | null;
  age_max: number | null;
  label: string | null;
};

export const POST_DISCOVERY_RADIUS_M = 50_000;

export const SCORING_ALLOWED_TYPES: readonly CommunityPostType[] = [
  'tournament',
  'social',
  'league',
] as const;

export const POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  tournament: 'Tournament',
  social: 'Social',
  league: 'League',
  training: 'Training',
  special_event: 'Special event',
};

export const POST_SUBTYPE_LABELS: Record<CommunityPostSubtype, string> = {
  elimination: 'Elimination',
  groups_knockout: 'Groups + knockout',
  round_robin: 'Round robin',
  americano: 'Americano',
  teams: 'Teams',
  mexicano: 'Mexicano',
  pozo: 'Pozo',
  mixer: 'Mixer',
  pairs: 'Pairs',
  ladder: 'Ladder',
  clinic: 'Clinic',
  group_class: 'Group class',
  camp: 'Camp',
  coach_course: 'Coach course',
  exhibition: 'Exhibition',
  festival: 'Festival',
  corporate: 'Corporate',
  other: 'Other',
};

export const SUBTYPES_BY_TYPE: Record<CommunityPostType, readonly CommunityPostSubtype[]> = {
  tournament: ['elimination', 'groups_knockout', 'round_robin', 'americano', 'teams'],
  social: ['americano', 'mexicano', 'pozo', 'mixer'],
  league: ['pairs', 'teams', 'ladder'],
  training: ['clinic', 'group_class', 'camp', 'coach_course'],
  special_event: ['exhibition', 'festival', 'corporate', 'other'],
};

export const DEFAULT_SUBTYPE_BY_TYPE: Record<CommunityPostType, CommunityPostSubtype> = {
  tournament: 'groups_knockout',
  social: 'americano',
  league: 'pairs',
  training: 'clinic',
  special_event: 'festival',
};

export type PostTagGroupId = 'included' | 'services' | 'prizes' | 'vibe';

export type PostTagGroup = {
  id: PostTagGroupId;
  label: string;
  tags: readonly CommunityPostTag[];
};

export const TAG_GROUPS: readonly PostTagGroup[] = [
  {
    id: 'included',
    label: 'Included',
    tags: [
      'welcome_kit',
      'tshirt',
      'new_balls',
      'hydration',
      'fruit_snacks',
      'food',
      'drinks',
    ],
  },
  {
    id: 'services',
    label: 'Services',
    tags: ['physio', 'photographer', 'streaming', 'referee', 'buffet', 'indoor_courts'],
  },
  {
    id: 'prizes',
    label: 'Prizes',
    tags: ['cash_prizes', 'product_prizes', 'trophies', 'raffles', 'ranking_points'],
  },
  {
    id: 'vibe',
    label: 'Vibe',
    tags: [
      'third_time',
      'music_dj',
      'night',
      'networking',
      'charity',
      'express',
      'beginner_friendly',
      'featured_pros',
      'sponsors',
    ],
  },
] as const;

export const POST_TAG_LABELS: Record<CommunityPostTag, string> = {
  welcome_kit: 'Welcome kit',
  tshirt: 'T-shirt',
  new_balls: 'New balls',
  hydration: 'Hydration',
  fruit_snacks: 'Fruit & snacks',
  food: 'Food',
  drinks: 'Drinks',
  physio: 'Physio',
  photographer: 'Photographer',
  streaming: 'Live stream',
  referee: 'Referee',
  buffet: 'Buffet',
  indoor_courts: 'Indoor courts',
  cash_prizes: 'Cash prizes',
  product_prizes: 'Product prizes',
  trophies: 'Trophies',
  raffles: 'Raffles',
  ranking_points: 'Ranking points',
  third_time: 'Third time',
  music_dj: 'Music / DJ',
  night: 'Night event',
  networking: 'Networking',
  charity: 'Charity',
  express: 'Express',
  beginner_friendly: 'Beginner friendly',
  featured_pros: 'Featured pros',
  sponsors: 'Sponsors',
};

export const SCORING_FORMAT_LABELS: Record<CommunityPostScoringFormat, string> = {
  best_of_3_sets: 'Best of 3 sets',
  two_sets_super_tiebreak: '2 sets + super tie-break',
  one_set_6: '1 set to 6',
  one_set_9: '1 set to 9 games',
  timed_or_points: 'Timed / points',
  other: 'Other (see rules)',
};

export const FEE_UNIT_LABELS: Record<CommunityPostFeeUnit, string> = {
  per_player: 'per player',
  per_pair: 'per pair',
  per_team: 'per team',
};

export const DIVISION_GENDER_LABELS: Record<CommunityPostDivisionGender, string> = {
  male: 'Men',
  female: 'Women',
  mixed: 'Mixed',
  open: 'Open',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

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

export function isSubtypeAllowed(
  type: CommunityPostType,
  subtype: CommunityPostSubtype,
): boolean {
  return SUBTYPES_BY_TYPE[type].includes(subtype);
}

export function scoringAllowedForType(type: CommunityPostType): boolean {
  return SCORING_ALLOWED_TYPES.includes(type);
}

function formatAgeBracket(ageMin: number | null, ageMax: number | null): string | null {
  if (ageMin !== null && ageMax !== null && ageMin === ageMax) {
    return `+${ageMin}`;
  }
  if (ageMin !== null && ageMax === null) {
    return `+${ageMin}`;
  }
  if (ageMin === null && ageMax !== null) {
    return `Sub-${ageMax}`;
  }
  if (ageMin !== null && ageMax !== null) {
    return `Ages ${ageMin}–${ageMax}`;
  }
  return null;
}

function formatDivisionCategory(
  categoryStrong: number | null,
  categoryWeak: number | null,
  categorySum: number | null,
): string | null {
  if (categorySum !== null) {
    return `Suma ${categorySum}`;
  }
  if (categoryStrong !== null && categoryWeak !== null) {
    if (categoryStrong === categoryWeak) {
      return formatCategoryLabel(categoryStrong);
    }
    return `${formatCategoryLabel(categoryStrong)}–${formatCategoryLabel(categoryWeak)}`;
  }
  if (categoryStrong !== null) {
    return formatCategoryLabel(categoryStrong);
  }
  if (categoryWeak !== null) {
    return formatCategoryLabel(categoryWeak);
  }
  return null;
}

export function formatDivision(division: CommunityPostDivisionInput | CommunityPostDivisionRow): string {
  const customLabel = division.label?.trim();
  if (customLabel !== undefined && customLabel.length > 0) {
    return `${DIVISION_GENDER_LABELS[division.gender]} · ${customLabel}`;
  }

  const parts: string[] = [DIVISION_GENDER_LABELS[division.gender]];
  const age = formatAgeBracket(division.age_min, division.age_max);
  const category = formatDivisionCategory(
    division.category_max,
    division.category_min,
    division.category_sum,
  );

  if (age !== null) {
    parts.push(age);
  }
  if (category !== null) {
    parts.push(category);
  }

  return parts.join(' · ');
}

export function formatDivisions(
  divisions: readonly (CommunityPostDivisionInput | CommunityPostDivisionRow)[],
  maxParts = 3,
): string | null {
  if (divisions.length === 0) return null;
  const labels = divisions.map((row) => formatDivision(row));
  if (labels.length <= maxParts) {
    return labels.join(' · ');
  }
  const shown = labels.slice(0, maxParts).join(' · ');
  return `${shown} · +${labels.length - maxParts} more`;
}

export function formatPostFee(
  entryFee: number | null,
  feeUnit: CommunityPostFeeUnit | null,
  hasDivisions: boolean,
): string | null {
  if (entryFee === null || feeUnit === null) return null;
  const amount = entryFee === 0 ? 'Free' : currencyFormatter.format(entryFee);
  const prefix = hasDivisions && entryFee > 0 ? 'From ' : '';
  if (entryFee === 0) {
    return 'Free entry';
  }
  return `${prefix}${amount} ${FEE_UNIT_LABELS[feeUnit]}`;
}

export function formatScoring(
  scoringFormat: CommunityPostScoringFormat | null,
  goldenPoint: boolean | null,
  guaranteedMatches: number | null,
): string | null {
  if (scoringFormat === null && goldenPoint === null && guaranteedMatches === null) {
    return null;
  }

  const parts: string[] = [];
  if (scoringFormat !== null) {
    parts.push(SCORING_FORMAT_LABELS[scoringFormat]);
  }
  if (goldenPoint === true) {
    parts.push('Golden point');
  }
  if (guaranteedMatches !== null && guaranteedMatches > 0) {
    parts.push(`${guaranteedMatches} guaranteed`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function formatPostTypeLine(
  type: CommunityPostType,
  subtype: CommunityPostSubtype | null,
): string {
  const base = POST_TYPE_LABELS[type];
  if (subtype === null) return base;
  return `${base} · ${POST_SUBTYPE_LABELS[subtype]}`;
}

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

export function formatRegistrationDeadline(deadline: string | null): string | null {
  if (deadline === null) return null;
  const date = new Date(deadline);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** @deprecated Legacy column; use hasConfirmedOrganizerContact on post.contacts */
export function isPostContactVerified(contactVerifiedAt: string | null): boolean {
  return contactVerifiedAt !== null;
}

export type CommunityPostContactRow =
  Database['public']['Tables']['community_post_contacts']['Row'];

export type CommunityPostContactInput = {
  phone: string;
  label: string | null;
};

export function sortPostContacts<T extends { position: number }>(contacts: T[]): T[] {
  return [...contacts].sort((a, b) => a.position - b.position);
}

export function hasConfirmedOrganizerContact(contacts: CommunityPostContactRow[]): boolean {
  return contacts.some((contact) => contact.confirmed_at !== null);
}

export function getConfirmedPostContacts(
  contacts: CommunityPostContactRow[],
): CommunityPostContactRow[] {
  return sortPostContacts(contacts).filter((contact) => contact.confirmed_at !== null);
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
