import { formatGenderLabel } from '@/features/matches/match-display';
import type { MatchSummary } from '@/features/matches/use-matches';
import { CATEGORY_TIER_LABEL, categoryToTier, type PadelCategoryTier } from '@/lib/padel-category';

export type DiscoverSort = 'distance' | 'soonest' | 'price';

export type WhenPreset = 'anytime' | 'today' | 'tomorrow' | 'weekend';

export type GenderFilter = 'all' | 'male' | 'female' | 'mixed';

export type LevelFilter = 'All' | PadelCategoryTier;

export type DiscoverFilters = {
  when: WhenPreset;
  level: LevelFilter;
  gender: GenderFilter;
  openSpotsOnly: boolean;
  sort: DiscoverSort;
};

export type FilterOption<T extends string> = {
  value: T;
  label: string;
};

export type WhenRange = {
  startMs: number;
  endMs: number;
};

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  when: 'anytime',
  level: 'All',
  gender: 'all',
  openSpotsOnly: false,
  sort: 'distance',
};

export const WHEN_OPTIONS: readonly FilterOption<WhenPreset>[] = [
  { value: 'anytime', label: 'Anytime' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This weekend' },
];

export const LEVEL_OPTIONS: readonly FilterOption<LevelFilter>[] = [
  { value: 'All', label: 'All levels' },
  { value: 'advanced', label: CATEGORY_TIER_LABEL.advanced },
  { value: 'intermediate', label: CATEGORY_TIER_LABEL.intermediate },
  { value: 'beginner', label: CATEGORY_TIER_LABEL.beginner },
];

export const GENDER_OPTIONS: readonly FilterOption<GenderFilter>[] = [
  { value: 'all', label: 'All genders' },
  { value: 'male', label: formatGenderLabel('male') },
  { value: 'female', label: formatGenderLabel('female') },
  { value: 'mixed', label: formatGenderLabel('mixed') },
];

export const SORT_OPTIONS: readonly FilterOption<DiscoverSort>[] = [
  { value: 'distance', label: 'Distance' },
  { value: 'soonest', label: 'Soonest' },
  { value: 'price', label: 'Price' },
];

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

/** Local-time day boundaries; weekend = upcoming Sat 00:00 through Sun 23:59. */
export function whenRange(preset: WhenPreset, now: Date = new Date()): WhenRange | null {
  if (preset === 'anytime') return null;

  if (preset === 'today') {
    const start = startOfLocalDay(now);
    return { startMs: start.getTime(), endMs: endOfLocalDay(start).getTime() };
  }

  if (preset === 'tomorrow') {
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() + 1);
    return { startMs: start.getTime(), endMs: endOfLocalDay(start).getTime() };
  }

  const day = now.getDay();
  let saturdayStart: Date;
  let sundayEnd: Date;

  if (day === 6) {
    saturdayStart = startOfLocalDay(now);
    sundayEnd = endOfLocalDay(new Date(saturdayStart.getTime()));
    sundayEnd.setDate(sundayEnd.getDate() + 1);
  } else if (day === 0) {
    saturdayStart = startOfLocalDay(now);
    saturdayStart.setDate(saturdayStart.getDate() - 1);
    sundayEnd = endOfLocalDay(now);
  } else {
    const daysUntilSaturday = 6 - day;
    saturdayStart = startOfLocalDay(now);
    saturdayStart.setDate(saturdayStart.getDate() + daysUntilSaturday);
    sundayEnd = endOfLocalDay(new Date(saturdayStart.getTime()));
    sundayEnd.setDate(sundayEnd.getDate() + 1);
  }

  return { startMs: saturdayStart.getTime(), endMs: sundayEnd.getTime() };
}

function matchPassesWhenFilter(match: MatchSummary, range: WhenRange | null): boolean {
  if (range === null) return true;
  const startMs = new Date(match.starts_at).getTime();
  return startMs >= range.startMs && startMs <= range.endMs;
}

function matchPassesLevelFilter(match: MatchSummary, level: LevelFilter): boolean {
  if (level === 'All') return true;
  return categoryToTier(match.category_max) === level;
}

function matchPassesGenderFilter(match: MatchSummary, gender: GenderFilter): boolean {
  if (gender === 'all') return true;
  return match.gender_preference === gender;
}

function matchHasOpenSpots(match: MatchSummary): boolean {
  return !match.isJoinFull && match.joinSpotsRemaining > 0;
}

export function applyDiscoverFilters(
  matches: MatchSummary[],
  filters: DiscoverFilters,
  now: Date = new Date(),
): MatchSummary[] {
  const range = whenRange(filters.when, now);

  return matches.filter(
    (match) =>
      matchPassesWhenFilter(match, range) &&
      matchPassesLevelFilter(match, filters.level) &&
      matchPassesGenderFilter(match, filters.gender) &&
      (!filters.openSpotsOnly || matchHasOpenSpots(match)),
  );
}

export function sortDiscoverMatches(
  matches: MatchSummary[],
  sort: DiscoverSort,
): MatchSummary[] {
  if (sort === 'distance') return matches;

  const copy = [...matches];

  if (sort === 'soonest') {
    copy.sort(
      (left, right) =>
        new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
    );
    return copy;
  }

  copy.sort((left, right) => {
    const leftPrice = left.price_per_player;
    const rightPrice = right.price_per_player;

    if (leftPrice === null && rightPrice === null) return 0;
    if (leftPrice === null) return 1;
    if (rightPrice === null) return -1;
    return leftPrice - rightPrice;
  });

  return copy;
}

export function countActiveDiscoverFilters(filters: DiscoverFilters): number {
  let count = 0;
  if (filters.when !== DEFAULT_DISCOVER_FILTERS.when) count += 1;
  if (filters.level !== DEFAULT_DISCOVER_FILTERS.level) count += 1;
  if (filters.gender !== DEFAULT_DISCOVER_FILTERS.gender) count += 1;
  if (filters.openSpotsOnly !== DEFAULT_DISCOVER_FILTERS.openSpotsOnly) count += 1;
  return count;
}

export function hasActiveDiscoverFilters(filters: DiscoverFilters): boolean {
  return countActiveDiscoverFilters(filters) > 0;
}

function findOptionLabel<T extends string>(
  options: readonly FilterOption<T>[],
  value: T,
): string {
  const found = options.find((option) => option.value === value);
  return found?.label ?? value;
}

export function whenFilterLabel(when: WhenPreset): string {
  return findOptionLabel(WHEN_OPTIONS, when);
}

export function levelFilterLabel(level: LevelFilter): string {
  return findOptionLabel(LEVEL_OPTIONS, level);
}

export function genderFilterLabel(gender: GenderFilter): string {
  return findOptionLabel(GENDER_OPTIONS, gender);
}

export function sortFilterLabel(sort: DiscoverSort): string {
  return findOptionLabel(SORT_OPTIONS, sort);
}
