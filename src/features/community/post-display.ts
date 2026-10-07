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

/** Ensures DB check: sum XOR category range (not both); range uses max=strongest, min=weakest. */
export function normalizeCommunityPostDivision(
  division: CommunityPostDivisionInput,
): CommunityPostDivisionInput {
  const label =
    division.label !== null && division.label.trim().length === 0 ? null : division.label;

  if (division.category_sum !== null) {
    return {
      ...division,
      label,
      category_min: null,
      category_max: null,
    };
  }

  let categoryMin = division.category_min;
  let categoryMax = division.category_max;

  if (
    categoryMin !== null &&
    categoryMax !== null &&
    categoryMax > categoryMin
  ) {
    const swappedMin = categoryMax;
    categoryMax = categoryMin;
    categoryMin = swappedMin;
  }

  return {
    ...division,
    label,
    category_sum: null,
    category_min: categoryMin,
    category_max: categoryMax,
  };
}

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

export const POST_TYPE_DESCRIPTIONS: Record<CommunityPostType, string> = {
  tournament: 'Compete for a title in a one-off event',
  social: 'Play many games and meet people',
  league: 'Compete over several weeks',
  training: 'Learn or improve',
  special_event: 'Something different around padel',
};

/** Legacy enum values kept in Postgres but not offered in create-post UI. */
export const LEGACY_SUBTYPES: readonly CommunityPostSubtype[] = [
  'elimination',
  'round_robin',
  'suma',
] as const;

export const POST_SUBTYPE_LABELS: Record<CommunityPostSubtype, string> = {
  elimination: 'Elimination',
  traditional: 'Traditional',
  suma: 'Sum',
  round_robin: 'Round robin',
  americano: 'Americano',
  teams: 'Teams',
  mexicano: 'Mexicano',
  pozo: 'King of the court',
  mixer: 'Mixer',
  pairs: 'Fixed pairs',
  ladder: 'Ladder',
  clinic: 'Clinic / masterclass',
  group_class: 'Group classes',
  camp: 'Camp',
  coach_course: 'Coach course',
  exhibition: 'Exhibition',
  festival: 'Padel fest',
  corporate: 'Corporate',
  other: 'Other',
};

export const SUBTYPE_DESCRIPTIONS_BY_TYPE: Record<
  CommunityPostType,
  Partial<Record<CommunityPostSubtype, string>>
> = {
  tournament: {
    traditional: 'Group stage, then a knockout bracket.',
    teams: 'Squads face off; each tie is several pair matches.',
    americano: 'Everyone partners with everyone in short games; individual points decide.',
    other: 'Custom format — describe it below.',
  },
  social: {
    americano: 'Rotate partners every game; points add up per player.',
    mexicano: 'Like Americano, but each round pairs players with similar scores so games stay even.',
    pozo: 'Win and move up a court, lose and move down. Also called Pozo.',
    mixer: 'Casual rotation that mixes levels and genders to meet new players.',
    other: 'Custom format — describe it below.',
  },
  league: {
    pairs: 'Same partner all season, with weekly fixtures.',
    teams: 'Squads play weekly ties.',
    ladder: 'Challenge players ranked above you to climb.',
    other: 'Custom format — describe it below.',
  },
  training: {
    clinic: 'Single session on a skill (bandeja, vibora…).',
    group_class: 'Recurring small-group classes.',
    camp: 'Intensive multi-day program.',
    coach_course: 'Course or certification for instructors.',
    other: 'Custom format — describe it below.',
  },
  special_event: {
    festival: 'Padel plus music, food or an after party.',
    exhibition: 'Pros or guests play a show match.',
    corporate: 'Company or brand event.',
    other: 'Custom format — describe it below.',
  },
};

export const SUBTYPES_BY_TYPE: Record<CommunityPostType, readonly CommunityPostSubtype[]> = {
  tournament: ['traditional', 'teams', 'americano', 'other'],
  social: ['americano', 'mexicano', 'pozo', 'mixer', 'other'],
  league: ['pairs', 'teams', 'ladder', 'other'],
  training: ['clinic', 'group_class', 'camp', 'coach_course', 'other'],
  special_event: ['festival', 'exhibition', 'corporate', 'other'],
};

export const DEFAULT_SUBTYPE_BY_TYPE: Record<CommunityPostType, CommunityPostSubtype> = {
  tournament: 'traditional',
  social: 'americano',
  league: 'pairs',
  training: 'clinic',
  special_event: 'festival',
};

export const DIVISION_REQUIRED_TYPES: readonly CommunityPostType[] = [
  'tournament',
  'league',
] as const;

export const DATE_OPTIONAL_TYPES: readonly CommunityPostType[] = ['training'] as const;

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

export function formatSubtypeLabel(
  type: CommunityPostType,
  subtype: CommunityPostSubtype,
  subtypeNote: string | null,
): string {
  if (subtype === 'other' && subtypeNote !== null && subtypeNote.trim().length > 0) {
    return subtypeNote.trim();
  }
  return POST_SUBTYPE_LABELS[subtype];
}

export function formatPostTypeLine(
  type: CommunityPostType,
  subtype: CommunityPostSubtype | null,
  subtypeNote: string | null = null,
): string {
  const base = POST_TYPE_LABELS[type];
  if (subtype === null) return base;
  return `${base} · ${formatSubtypeLabel(type, subtype, subtypeNote)}`;
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
