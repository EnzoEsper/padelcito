import type { Database } from '@/types/database';

type SkillLevel = Database['public']['Enums']['skill_level'];

export type PadelCategoryTier = 'advanced' | 'beginner' | 'intermediate';

export type PadelCategory = {
  number: number;
  label: string;
  tier: PadelCategoryTier;
};

export const PADEL_CATEGORIES: readonly PadelCategory[] = [
  { number: 1, label: '1ª', tier: 'advanced' },
  { number: 2, label: '2ª', tier: 'advanced' },
  { number: 3, label: '3ª', tier: 'advanced' },
  { number: 4, label: '4ª', tier: 'intermediate' },
  { number: 5, label: '5ª', tier: 'intermediate' },
  { number: 6, label: '6ª', tier: 'intermediate' },
  { number: 7, label: '7ª', tier: 'beginner' },
  { number: 8, label: '8ª', tier: 'beginner' },
] as const;

export const PADEL_CATEGORY_NUMBERS = PADEL_CATEGORIES.map((c) => c.number);

const CATEGORY_TO_SKILL: Record<number, SkillLevel> = {
  1: 'pro',
  2: 'expert',
  3: 'advanced',
  4: 'advanced',
  5: 'intermediate',
  6: 'intermediate',
  7: 'beginner',
  8: 'beginner',
};

export function formatCategoryLabel(number: number): string {
  const found = PADEL_CATEGORIES.find((c) => c.number === number);
  return found?.label ?? `${number}ª`;
}

/** e.g. "Categories 3ª to 5ª · 1ª is the highest level" */
export function formatCategoryRangeLabel(categoryMax: number, categoryMin: number): string {
  const suffix = ' · 1ª is the highest level';
  if (categoryMax === categoryMin) {
    return `Category ${formatCategoryLabel(categoryMax)}${suffix}`;
  }
  return `Categories ${formatCategoryLabel(categoryMax)} to ${formatCategoryLabel(categoryMin)}${suffix}`;
}

export type CategoryRangeBounds = {
  categoryMax: number;
  categoryMin: number;
};

/**
 * Discrete range picker (strongest = lower number):
 * - Tap while a range is shown → select that level only (confirmed single).
 * - Tap another level while a single is shown → range spanning both.
 * - Tap the same level again while already single → no change.
 */
export function computeNextCategoryRange(
  categoryMax: number,
  categoryMin: number,
  tapped: number,
): CategoryRangeBounds {
  const level = Math.min(8, Math.max(1, tapped));
  const isSingle = categoryMax === categoryMin;

  if (isSingle && level === categoryMax) {
    return { categoryMax, categoryMin };
  }

  if (isSingle) {
    return {
      categoryMax: Math.min(categoryMax, level),
      categoryMin: Math.max(categoryMin, level),
    };
  }

  return { categoryMax: level, categoryMin: level };
}

/**
 * Maps accepted category band to skill_min / skill_max for Discover filters.
 * categoryMax = strongest accepted (lower number); categoryMin = weakest (higher number).
 */
export function categoryRangeToSkillLevels(
  categoryMax: number,
  categoryMin: number,
): { skillMin: SkillLevel; skillMax: SkillLevel } {
  const skillForStrongest = CATEGORY_TO_SKILL[categoryMax] ?? 'intermediate';
  const skillForWeakest = CATEGORY_TO_SKILL[categoryMin] ?? 'intermediate';

  const order: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert', 'pro'];
  const minIndex = order.indexOf(skillForWeakest);
  const maxIndex = order.indexOf(skillForStrongest);

  if (minIndex === -1 || maxIndex === -1) {
    return { skillMin: 'intermediate', skillMax: 'intermediate' };
  }

  return {
    skillMin: order[Math.min(minIndex, maxIndex)],
    skillMax: order[Math.max(minIndex, maxIndex)],
  };
}

export function clampCategoryRange(
  categoryMax: number,
  categoryMin: number,
): { categoryMax: number; categoryMin: number } {
  const max = Math.min(8, Math.max(1, categoryMax));
  const min = Math.min(8, Math.max(1, categoryMin));
  return max <= min ? { categoryMax: max, categoryMin: min } : { categoryMax: min, categoryMin: max };
}
