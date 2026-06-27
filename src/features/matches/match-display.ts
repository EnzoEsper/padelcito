import type { QueryClient } from '@tanstack/react-query';
import {
  createDefaultCourtConfig,
  formatCourtStructureLabel,
  formatCourtSurfaceLabel,
  formatCourtTypeLabel,
  resizeCourtConfigs,
  type CourtConfig,
  type CourtFormat,
  type CourtStructure,
  type CourtSurface,
  type CourtType,
} from '@/lib/padel-court';
import {
  formatCategoryLabel,
  categoryToTier,
} from '@/lib/padel-category';
import { POSITION_PREFERENCE_OPTIONS } from '@/lib/padel-position';
import { distanceMeters, parseGeographyPoint, type Coords } from '@/lib/location';
import { matchKeys, type MatchSummary } from '@/features/matches/use-matches';
import type { Database } from '@/types/database';

type Json = Database['public']['Tables']['matches']['Row']['court_configs'];
type GenderPreference = Database['public']['Enums']['match_gender_preference'];
type MatchDifficulty = Database['public']['Enums']['match_difficulty'];
type MatchStatus = Database['public']['Enums']['match_status'];
type ParticipantStatus = Database['public']['Enums']['participant_status'];
type PositionPreference = Database['public']['Enums']['match_position_preference'];

export type MatchStatusBadgeTone = 'open' | 'full' | 'live' | 'finished' | 'cancelled';

export type MatchStatusBadgeConfig = {
  label: string;
  tone: MatchStatusBadgeTone;
};

export type ParticipantStatusMembershipTone = 'pending' | 'accepted' | 'inactive';

export type ParticipantStatusDisplay = {
  label: string;
  tone: ParticipantStatusMembershipTone;
  pulse: boolean;
};

/** Card accent strength from the match's strongest accepted category (1ª = highest). */
export type CategoryAccentLevel = 'high' | 'mid' | 'low';

const ARS_DISPLAY = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const COURT_FORMATS = new Set<CourtFormat>(['singles', 'doubles']);
const COURT_TYPES = new Set<CourtType>(['indoor', 'outdoor', 'semi_indoor']);
const COURT_STRUCTURES = new Set<CourtStructure>(['glass', 'panoramic', 'concrete']);
const COURT_SURFACES = new Set<CourtSurface>(['grass', 'concrete']);

const GENDER_LABELS: Record<GenderPreference, string> = {
  male: 'Men',
  female: 'Women',
  mixed: 'Mixed',
};

const DIFFICULTY_LABELS: Record<MatchDifficulty, string> = {
  friendly: 'Friendly',
  competitive: 'Competitive',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCourtConfigEntry(value: unknown): CourtConfig | null {
  if (!isRecord(value)) return null;
  const { format, type, structure, surface } = value;
  if (
    typeof format !== 'string' ||
    typeof type !== 'string' ||
    typeof structure !== 'string' ||
    typeof surface !== 'string' ||
    !COURT_FORMATS.has(format as CourtFormat) ||
    !COURT_TYPES.has(type as CourtType) ||
    !COURT_STRUCTURES.has(structure as CourtStructure) ||
    !COURT_SURFACES.has(surface as CourtSurface)
  ) {
    return null;
  }

  return {
    format: format as CourtFormat,
    type: type as CourtType,
    structure: structure as CourtStructure,
    surface: surface as CourtSurface,
  };
}

export function parseMatchCourtConfigs(json: Json): CourtConfig[] {
  if (!Array.isArray(json)) {
    return [createDefaultCourtConfig()];
  }

  const parsed = json
    .map((entry) => parseCourtConfigEntry(entry))
    .filter((entry): entry is CourtConfig => entry !== null);

  return parsed.length > 0 ? parsed : [createDefaultCourtConfig()];
}

export function resolveMatchCourtConfigs(json: Json, courtCount: number): CourtConfig[] {
  return resizeCourtConfigs(parseMatchCourtConfigs(json), courtCount);
}

export function formatMatchPriceArs(price: number): string {
  return ARS_DISPLAY.format(price);
}

export function formatCategoryCompact(categoryMax: number, categoryMin: number): string {
  if (categoryMax === categoryMin) {
    return formatCategoryLabel(categoryMax);
  }
  return `${formatCategoryLabel(categoryMax)}–${formatCategoryLabel(categoryMin)}`;
}

/** UI-only duration label for match cards (hours, not minutes). */
export function formatMatchDurationHours(minutes: number): string {
  if (minutes < 60) {
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hr' : `${hours} hr`;
  }
  const hours = minutes / 60;
  const label = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, '');
  return `${label} hr`;
}

export function categoryAccentLevel(categoryMax: number): CategoryAccentLevel {
  const tier = categoryToTier(categoryMax);
  if (tier === 'advanced') {
    return categoryMax <= 2 ? 'high' : 'mid';
  }
  return 'low';
}

export function formatGenderLabel(gender: GenderPreference): string {
  return GENDER_LABELS[gender];
}

export function formatDifficultyLabel(difficulty: MatchDifficulty): string {
  return DIFFICULTY_LABELS[difficulty];
}

export function formatPositionLabel(position: PositionPreference): string {
  return POSITION_PREFERENCE_OPTIONS.find((option) => option.value === position)?.label ?? position;
}

export function formatAgeRangeLabel(ageMin: number | null, ageMax: number | null): string | null {
  if (ageMin !== null && ageMax !== null) {
    return ageMin === ageMax ? String(ageMin) : `${ageMin}–${ageMax}`;
  }
  if (ageMin !== null) return `${ageMin}+`;
  if (ageMax !== null) return `Up to ${ageMax}`;
  return null;
}

export function formatDistanceKm(distanceM: number): string {
  const km = distanceM / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km).toString()}KM`;
}

function parseIntervalHoursMinutes(interval: string): { hours: number; minutes: number } | null {
  const trimmed = interval.trim();
  if (trimmed.length === 0) return null;

  const clockMatch = trimmed.match(/^(\d+):(\d{2}):(\d{2})$/u);
  if (clockMatch !== null) {
    const hours = Number.parseInt(clockMatch[1], 10);
    const minutes = Number.parseInt(clockMatch[2], 10);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return { hours, minutes };
    }
  }

  let hours = 0;
  let minutes = 0;
  const hourMatch = trimmed.match(/(\d+)\s*h(?:our|ours|rs?)?/iu);
  const minuteMatch = trimmed.match(/(\d+)\s*m(?:in|inute|inutes)?/iu);
  if (hourMatch !== null) hours = Number.parseInt(hourMatch[1], 10);
  if (minuteMatch !== null) minutes = Number.parseInt(minuteMatch[1], 10);

  if (hourMatch !== null || minuteMatch !== null) {
    return { hours, minutes };
  }

  const dayMatch = trimmed.match(/(\d+)\s*d(?:ay|ays)?/iu);
  if (dayMatch !== null) {
    return { hours: Number.parseInt(dayMatch[1], 10) * 24, minutes: 0 };
  }

  return null;
}

export function formatWithdrawalThreshold(interval: string): string {
  const parsed = parseIntervalHoursMinutes(interval);
  if (parsed === null) return '2h';

  const { hours, minutes } = parsed;
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function lateWithdrawalThresholdMs(interval: string): number {
  const parsed = parseIntervalHoursMinutes(interval);
  if (parsed === null) return 2 * 60 * 60 * 1000;
  return (parsed.hours * 60 + parsed.minutes) * 60 * 1000;
}

/** Mirrors DB: now >= starts_at - late_withdrawal_threshold. */
export function isWithinLateWithdrawalWindow(
  startsAt: string,
  thresholdInterval: string,
  nowMs: number = Date.now(),
): boolean {
  const startMs = new Date(startsAt).getTime();
  return nowMs >= startMs - lateWithdrawalThresholdMs(thresholdInterval);
}

function allSame<T>(values: T[]): boolean {
  return values.every((value) => value === values[0]);
}

export function formatCourtFormatLabel(format: CourtFormat): string {
  return format === 'singles' ? 'Singles' : 'Doubles';
}

export function formatCourtCountLabel(courtCount: number): string {
  return courtCount === 1 ? '1 court' : `${courtCount} courts`;
}

export function formatCourtConfigDescription(config: CourtConfig): string {
  return [
    formatCourtFormatLabel(config.format),
    formatCourtTypeLabel(config.type),
    formatCourtStructureLabel(config.structure),
    formatCourtSurfaceLabel(config.surface),
  ].join(' · ');
}

export function formatHeroCaption(courtCount: number, configs: CourtConfig[]): string {
  if (courtCount > 1) {
    const formatLabel = allSame(configs.map((config) => config.format))
      ? formatCourtFormatLabel(configs[0].format)
      : 'Mixed';
    return `${courtCount} Courts · ${formatLabel}`;
  }

  const primary = configs[0] ?? createDefaultCourtConfig();
  return `Court · ${formatCourtStructureLabel(primary.structure)} · ${formatCourtTypeLabel(primary.type)}`;
}

export type MatchMetaChipEmphasis = 'primary' | 'secondary' | 'default';

export type MatchPreferenceChip = {
  key: string;
  label: string;
  emphasis: MatchMetaChipEmphasis;
};

export function buildMatchMetaChips(match: {
  gender_preference: GenderPreference;
  difficulty: MatchDifficulty;
  position_preference: PositionPreference;
  age_min: number | null;
  age_max: number | null;
  price_per_player: number | null;
}): MatchPreferenceChip[] {
  const chips: MatchPreferenceChip[] = [];

  if (match.price_per_player !== null) {
    chips.push({
      key: 'difficulty',
      label: formatDifficultyLabel(match.difficulty),
      emphasis: 'secondary',
    });
  }

  chips.push({
    key: 'gender',
    label: formatGenderLabel(match.gender_preference),
    emphasis: 'default',
  });

  if (match.position_preference !== 'any') {
    chips.push({
      key: 'position',
      label: formatPositionLabel(match.position_preference),
      emphasis: 'default',
    });
  }

  const ageLabel = formatAgeRangeLabel(match.age_min, match.age_max);
  if (ageLabel !== null) {
    chips.push({ key: 'age', label: `Age ${ageLabel}`, emphasis: 'default' });
  }

  return chips;
}

/** @deprecated Use buildMatchMetaChips */
export function buildMatchPreferenceChips(match: Parameters<typeof buildMatchMetaChips>[0]): MatchPreferenceChip[] {
  return buildMatchMetaChips(match);
}

function readCachedDiscoverDistanceM(queryClient: QueryClient, matchId: string): number | null {
  const entries = queryClient.getQueriesData<MatchSummary[]>({
    queryKey: matchKeys.discoverPrefix,
  });

  for (const [, matches] of entries) {
    if (matches === undefined) continue;
    const found = matches.find((match) => match.id === matchId);
    if (found?.distanceM !== undefined) {
      return found.distanceM;
    }
  }

  return null;
}

export function resolveMatchDistanceM({
  matchId,
  matchLocation,
  userCoords,
  queryClient,
}: {
  matchId: string;
  matchLocation: unknown;
  userCoords: Coords | null;
  queryClient: QueryClient;
}): number | null {
  const cached = readCachedDiscoverDistanceM(queryClient, matchId);
  if (cached !== null) return cached;

  if (userCoords === null) return null;

  const matchCoords = parseGeographyPoint(matchLocation);
  if (matchCoords === null) return null;

  return distanceMeters(userCoords, matchCoords);
}

export function formatProfileRating(
  ratingAvg: number | null,
  ratingCount: number | null,
): string | null {
  if (ratingAvg === null || ratingCount === null || ratingCount <= 0) {
    return null;
  }
  return ratingAvg.toFixed(1);
}

export function hasHostNote(description: string | null): boolean {
  return description !== null && description.trim().length > 0;
}

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  open: 'Open',
  full: 'Full',
  in_progress: 'Live',
  finished: 'Finished',
  cancelled: 'Cancelled',
};

export function resolveMatchStatusBadge(status: MatchStatus): MatchStatusBadgeConfig {
  switch (status) {
    case 'open':
      return { label: MATCH_STATUS_LABELS.open, tone: 'open' };
    case 'full':
      return { label: MATCH_STATUS_LABELS.full, tone: 'full' };
    case 'in_progress':
      return { label: MATCH_STATUS_LABELS.in_progress, tone: 'live' };
    case 'finished':
      return { label: MATCH_STATUS_LABELS.finished, tone: 'finished' };
    case 'cancelled':
      return { label: MATCH_STATUS_LABELS.cancelled, tone: 'cancelled' };
  }
}

const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  removed: 'Removed',
  cancelled: 'Cancelled',
};

/** Card/footer label for match_participants.status — mirrors participant_status enum. */
export function resolveParticipantStatusDisplay(
  status: ParticipantStatus,
): ParticipantStatusDisplay {
  switch (status) {
    case 'pending':
      return {
        label: PARTICIPANT_STATUS_LABELS.pending,
        tone: 'pending',
        pulse: true,
      };
    case 'accepted':
      return {
        label: PARTICIPANT_STATUS_LABELS.accepted,
        tone: 'accepted',
        pulse: true,
      };
    case 'rejected':
    case 'withdrawn':
    case 'removed':
    case 'cancelled':
      return {
        label: PARTICIPANT_STATUS_LABELS[status],
        tone: 'inactive',
        pulse: false,
      };
  }
}
