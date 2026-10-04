import { z } from 'zod';
import type { Database } from '@/types/database';

type SkillLevel = Database['public']['Enums']['skill_level'];

export type PadelCategoryNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type PadelCategoryTier = 'beginner' | 'intermediate' | 'expert';

export type PadelCategoryGroup = {
  tier: PadelCategoryTier;
  label: string;
  numbers: readonly PadelCategoryNumber[];
};

export const PADEL_CATEGORY_MIN = 1;
export const PADEL_CATEGORY_MAX = 9;

export const PADEL_CATEGORY_GROUPS: readonly PadelCategoryGroup[] = [
  { tier: 'beginner', label: 'Beginner', numbers: [9, 8, 7] },
  { tier: 'intermediate', label: 'Intermediate', numbers: [6, 5, 4] },
  { tier: 'expert', label: 'Expert', numbers: [3, 2, 1] },
] as const;

export const PADEL_CATEGORIES: readonly PadelCategoryNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];


export const PADEL_CATEGORY_DESCRIPTIONS: Record<PadelCategoryNumber, string> = {
  9: 'You are starting to play padel and getting familiar with the most basic aspects of the sport.',
  8: 'You have some padel experience, know the basic fundamentals, and can join low-intensity matches.',
  7: 'You are progressing—you know basic strokes and how the game works, but you are still building consistency and accuracy.',
  6: 'You are moving from beginner to intermediate, starting to master basic strokes with more confidence in your game.',
  5: 'You are at an intermediate level with good ball control, can hit a variety of shots with reasonable precision, and keep up consistent rallies at a good pace.',
  4: 'You are at a competitive level and can play in registered fourth-category tournaments.',
  3: 'You are at a competitive level and can play in registered third-category tournaments.',
  2: 'You are at a professional level and compete in registered second-category pro tournaments.',
  1: 'You are at a professional level and compete in registered first-category pro tournaments.',
};

const CATEGORY_TO_SKILL: Record<PadelCategoryNumber, SkillLevel> = {
  9: 'beginner',
  8: 'beginner',
  7: 'beginner',
  6: 'intermediate',
  5: 'intermediate',
  4: 'intermediate',
  3: 'advanced',
  2: 'expert',
  1: 'pro',
};

const TIER_BY_CATEGORY: Record<PadelCategoryNumber, PadelCategoryTier> = {
  9: 'beginner',
  8: 'beginner',
  7: 'beginner',
  6: 'intermediate',
  5: 'intermediate',
  4: 'intermediate',
  3: 'expert',
  2: 'expert',
  1: 'expert',
};

export const CATEGORY_TIER_LABEL: Record<PadelCategoryTier, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
};

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function isPadelCategoryNumber(value: number): value is PadelCategoryNumber {
  return Number.isInteger(value) && value >= PADEL_CATEGORY_MIN && value <= PADEL_CATEGORY_MAX;
}

export const padelCategoryFieldSchema = z.custom<PadelCategoryNumber>(
  (value) => typeof value === 'number' && isPadelCategoryNumber(value),
  'Select your padel category',
);

export const padelCategoryFormSchema = z.object({
  padel_category: padelCategoryFieldSchema,
});

export function clampPadelCategory(value: number): PadelCategoryNumber {
  const clamped = Math.min(PADEL_CATEGORY_MAX, Math.max(PADEL_CATEGORY_MIN, Math.round(value)));
  return clamped as PadelCategoryNumber;
}

/** Display label, e.g. 1 → "1st" (strongest). */
export function formatCategoryLabel(number: number): string {
  const n = clampPadelCategory(number);
  return `${n}${ordinalSuffix(n)}`;
}

export function getPadelCategoryDescription(number: number): string {
  if (!isPadelCategoryNumber(number)) {
    return '';
  }
  return PADEL_CATEGORY_DESCRIPTIONS[number];
}

export function categoryToTier(category: number): PadelCategoryTier {
  if (!isPadelCategoryNumber(category)) {
    return 'intermediate';
  }
  return TIER_BY_CATEGORY[category];
}

export function categoryToSkillLevel(category: number): SkillLevel {
  if (!isPadelCategoryNumber(category)) {
    return 'intermediate';
  }
  return CATEGORY_TO_SKILL[category];
}

/** e.g. "Categories 4th to 6th · 1st is the highest level" */
export function formatCategoryRangeLabel(categoryMax: number, categoryMin: number): string {
  const suffix = ' · 1st is the highest level';
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
  const level = clampPadelCategory(tapped);
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
  const skillForStrongest = categoryToSkillLevel(categoryMax);
  const skillForWeakest = categoryToSkillLevel(categoryMin);

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
  const max = clampPadelCategory(categoryMax);
  const min = clampPadelCategory(categoryMin);
  return max <= min ? { categoryMax: max, categoryMin: min } : { categoryMax: min, categoryMin: max };
}
