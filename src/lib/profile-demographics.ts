import type { Database } from '@/types/database';
import { formatAgeRangeLabel, formatGenderLabel } from '@/features/matches/match-display';

export type ProfileGender = Database['public']['Enums']['profile_gender'];
export type MatchGenderPreference = Database['public']['Enums']['match_gender_preference'];

export const PROFILE_GENDER_OPTIONS: {
  value: ProfileGender;
  label: string;
  description?: string;
}[] = [
  { value: 'unspecified', label: 'Skip for now', description: 'Not shown on your profile' },
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  {
    value: 'hidden',
    label: 'Prefer not to say',
    description: 'Not shown on your public profile',
  },
];

export const MIN_PROFILE_AGE_YEARS = 13;
export const MAX_PROFILE_AGE_YEARS = 99;

export function formatProfileGenderLabel(gender: ProfileGender | null): string | null {
  if (gender === null || gender === 'unspecified' || gender === 'hidden') {
    return null;
  }
  return PROFILE_GENDER_OPTIONS.find((option) => option.value === gender)?.label ?? gender;
}

export function formatDemographicsSummary(parts: {
  gender: ProfileGender | null;
  ageYears: number | null;
}): string | null {
  const segments: string[] = [];
  const genderLabel = formatProfileGenderLabel(parts.gender);
  if (genderLabel !== null) {
    segments.push(genderLabel);
  }
  if (parts.ageYears !== null && parts.ageYears > 0) {
    segments.push(String(parts.ageYears));
  }
  if (segments.length === 0) {
    return null;
  }
  return segments.join(' · ');
}

export function computeAgeYearsFromBirthDate(birthDate: string | null): number | null {
  if (birthDate === null || birthDate.length === 0) {
    return null;
  }
  const parsed = Date.parse(`${birthDate}T12:00:00`);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const birth = new Date(parsed);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatBirthDateLabel(isoDate: string | null): string {
  if (isoDate === null || isoDate.length === 0) {
    return 'Not set';
  }
  const parsed = Date.parse(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed)) {
    return 'Not set';
  }
  return new Date(parsed).toLocaleDateString('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getBirthDatePickerBounds(now = new Date()): {
  minimumDate: Date;
  maximumDate: Date;
} {
  const maximumDate = new Date(
    now.getFullYear() - MIN_PROFILE_AGE_YEARS,
    now.getMonth(),
    now.getDate(),
  );
  const minimumDate = new Date(
    now.getFullYear() - MAX_PROFILE_AGE_YEARS,
    now.getMonth(),
    now.getDate(),
  );
  return { minimumDate, maximumDate };
}

export function isBirthDateEligible(isoDate: string): boolean {
  const age = computeAgeYearsFromBirthDate(isoDate);
  if (age === null) {
    return false;
  }
  return age >= MIN_PROFILE_AGE_YEARS && age <= MAX_PROFILE_AGE_YEARS;
}

export type DemographicsCompatibilityTone = 'success' | 'warning' | 'neutral';

export type DemographicsCompatibility = {
  message: string;
  tone: DemographicsCompatibilityTone;
};

export type MatchDemographicsContext = {
  profileGender: ProfileGender | null;
  profileAgeYears: number | null;
  matchGenderPreference: MatchGenderPreference;
  matchAgeMin: number | null;
  matchAgeMax: number | null;
};

export function matchHasDemographicsConstraints(context: {
  matchGenderPreference: MatchGenderPreference;
  matchAgeMin: number | null;
  matchAgeMax: number | null;
}): boolean {
  const hasAgeConstraint = context.matchAgeMin !== null || context.matchAgeMax !== null;
  return hasAgeConstraint;
}

export function profileMissingDemographics(context: {
  profileGender: ProfileGender | null;
  profileAgeYears: number | null;
  matchAgeMin: number | null;
  matchAgeMax: number | null;
}): boolean {
  const needsAge = context.matchAgeMin !== null || context.matchAgeMax !== null;
  const missingGender = false;
  const missingAge = needsAge && context.profileAgeYears === null;
  return missingGender || missingAge;
}

export function resolveMatchDemographicsCompatibility(
  context: MatchDemographicsContext,
): DemographicsCompatibility | null {
  const ageLabel = formatAgeRangeLabel(context.matchAgeMin, context.matchAgeMax);
  const matchGenderLabel = formatGenderLabel(context.matchGenderPreference);

  let genderConflict = false;
  if (
    context.matchGenderPreference === 'male' &&
    context.profileGender === 'female'
  ) {
    genderConflict = true;
  }
  if (
    context.matchGenderPreference === 'female' &&
    context.profileGender === 'male'
  ) {
    genderConflict = true;
  }

  let ageConflict = false;
  if (context.profileAgeYears !== null) {
    if (context.matchAgeMin !== null && context.profileAgeYears < context.matchAgeMin) {
      ageConflict = true;
    }
    if (context.matchAgeMax !== null && context.profileAgeYears > context.matchAgeMax) {
      ageConflict = true;
    }
  }

  if (genderConflict && ageConflict && ageLabel !== null) {
    return {
      tone: 'warning',
      message: `This match is ${matchGenderLabel.toLowerCase()} · ages ${ageLabel}. Your profile may not fit.`,
    };
  }

  if (genderConflict) {
    return {
      tone: 'warning',
      message: `This match is ${matchGenderLabel.toLowerCase()}. Your profile gender may not fit.`,
    };
  }

  if (ageConflict && ageLabel !== null) {
    return {
      tone: 'warning',
      message: `This match seeks ages ${ageLabel}. Your age (${context.profileAgeYears}) is outside the range.`,
    };
  }

  if (context.profileAgeYears !== null && ageLabel !== null && !ageConflict) {
    return {
      tone: 'success',
      message: `Fits this match's age range (${ageLabel}).`,
    };
  }

  if (ageLabel !== null && context.profileAgeYears === null) {
    return {
      tone: 'neutral',
      message: `Match seeks ages ${ageLabel}. Age not shared on your profile — host will confirm.`,
    };
  }

  return null;
}

export function resolveMissingProfileDemographicsHint(context: {
  profileGender: ProfileGender | null;
  profileAgeYears: number | null;
  matchAgeMin: number | null;
  matchAgeMax: number | null;
}): string | null {
  const needsAge = context.matchAgeMin !== null || context.matchAgeMax !== null;
  if (!needsAge) {
    return null;
  }
  if (context.profileAgeYears !== null) {
    return null;
  }
  const ageLabel = formatAgeRangeLabel(context.matchAgeMin, context.matchAgeMax);
  if (ageLabel === null) {
    return 'Add your birth date to see whether you fit this match age range.';
  }
  return `Add your birth date to see whether you fit this match (${ageLabel}).`;
}
