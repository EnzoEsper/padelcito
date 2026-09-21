import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { fetchPadelSportFresh } from '@/lib/padel-sport';
import { useOnboardingContext } from '@/lib/onboarding-context';
import type { Database } from '@/types/database';
import { isBirthDateEligible, MIN_PROFILE_AGE_YEARS } from '@/lib/profile-demographics';

type DominantHand = Database['public']['Enums']['dominant_hand'];
type CourtSidePreference = Database['public']['Enums']['match_position_preference'];
type ProfileGender = Database['public']['Enums']['profile_gender'];

// ─── Skill level enum ────────────────────────────────────────────────────────

export const SKILL_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'pro',
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

// ─── Validation schema ────────────────────────────────────────────────────────

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Must be at least 3 characters')
    .max(30, 'Cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters'),
  whatsapp_phone: z
    .string()
    .transform(normalizeWhatsAppPhone)
    .pipe(
      z.string().refine(
        (val) => val === '' || /^\+[1-9][0-9]{6,14}$/.test(val),
        { message: 'Use international format, e.g. +54911XXXXXXXX' },
      ),
    ),
  skill_level: z.enum(SKILL_LEVELS),
  dominant_hand: z.enum(['unspecified', 'right', 'left', 'ambidextrous']),
  court_side_preference: z.enum(['any', 'drive', 'backhand']),
  years_playing: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z.string().refine(
        (val) => val === '' || (/^\d+$/.test(val) && Number(val) <= 80),
        { message: 'Enter a number up to 80' },
      ),
    ),
  gender: z.enum(['unspecified', 'male', 'female', 'hidden']),
  birth_date: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z.string().refine(
        (val) => val === '' || isBirthDateEligible(val),
        { message: `You must be at least ${MIN_PROFILE_AGE_YEARS} years old` },
      ),
    ),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/** TEMP: Argentina-only WhatsApp helpers for easier local onboarding. Revert for international input. */
export const TEMP_ARGENTINA_WHATSAPP_PREFIX = '+54';
export const TEMP_DEFAULT_WHATSAPP_LOCAL = '911';

export function formatArgentinaWhatsAppLocal(fullPhone: string): string {
  if (fullPhone === '') return '';
  if (fullPhone.startsWith(TEMP_ARGENTINA_WHATSAPP_PREFIX)) {
    return fullPhone.slice(TEMP_ARGENTINA_WHATSAPP_PREFIX.length);
  }
  return fullPhone.replace(/\D/g, '');
}

export function composeArgentinaWhatsAppPhone(localDigits: string): string {
  const digits = localDigits.replace(/\D/g, '');
  if (digits === '') return '';
  return `${TEMP_ARGENTINA_WHATSAPP_PREFIX}${digits}`;
}

function normalizeWhatsAppPhone(val: string): string {
  const trimmed = val.trim();
  if (trimmed === '') return '';
  if (/^\+[1-9][0-9]{6,14}$/.test(trimmed)) return trimmed;
  // TEMP: unfinished Argentine entry stays optional — drop partial prefix on save.
  if (trimmed.startsWith(TEMP_ARGENTINA_WHATSAPP_PREFIX)) return '';
  return trimmed;
}

// ─── Main onboarding hook ─────────────────────────────────────────────────────

export type UseOnboardingProfileReturn = {
  control: Control<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
  isSubmitting: boolean;
  submitError: string | null;
  bioValue: string;
  onSubmit: () => void;
};

export function useOnboardingProfile(): UseOnboardingProfileReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { markProfileComplete } = useOnboardingContext();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: {
      username: '',
      bio: '',
      whatsapp_phone: composeArgentinaWhatsAppPhone(TEMP_DEFAULT_WHATSAPP_LOCAL),
      dominant_hand: 'unspecified' satisfies DominantHand,
      court_side_preference: 'any' satisfies CourtSidePreference,
      years_playing: '',
      gender: 'unspecified' satisfies ProfileGender,
      birth_date: '',
    },
  });

  const bioValue = watch('bio');

  const onSubmit = useCallback(
    () =>
      void handleSubmit(async (data) => {
        setSubmitError(null);

        // 1. Verify the session is still live
        const { data: authData, error: userError } = await supabase.auth.getUser();
        if (userError !== null || authData.user === null) {
          setSubmitError('Your session has expired. Please sign in again.');
          return;
        }
        const userId = authData.user.id;

        // 2. Upsert the profiles row
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          username: data.username.trim(),
          bio: data.bio.trim() || null,
          whatsapp_phone: data.whatsapp_phone.trim() || null,
          gender: data.gender,
          birth_date: data.birth_date.length > 0 ? data.birth_date : null,
        });

        if (profileError !== null) {
          if (profileError.code === '23505') {
            setSubmitError('That username is already taken. Please choose another.');
          } else {
            logger.error('profiles.upsert failed', profileError);
            setSubmitError(profileError.message);
          }
          return;
        }

        // 3. Resolve the Padel sport FK (fresh fetch — persisted cache can hold stale ids after db reset)
        let padelSport;
        try {
          padelSport = await fetchPadelSportFresh(queryClient);
        } catch (sportError) {
          logger.error('padel sport lookup failed', sportError);
          setSubmitError('Padel sport not found in our system. Please contact support.');
          return;
        }

        // 4. Upsert profile_sports (safe if the row already exists)
        const parsedYears =
          data.years_playing.length > 0 ? Number.parseInt(data.years_playing, 10) : null;
        const yearsPlaying =
          parsedYears !== null && !Number.isNaN(parsedYears) ? parsedYears : null;

        const upsertProfileSport = async (sportId: string) =>
          supabase.from('profile_sports').upsert(
            {
              profile_id: userId,
              sport_id: sportId,
              skill_level: data.skill_level,
              dominant_hand: data.dominant_hand,
              court_side_preference: data.court_side_preference,
              years_playing: yearsPlaying,
            },
            { onConflict: 'profile_id,sport_id' },
          );

        let sportInsertError = (await upsertProfileSport(padelSport.id)).error;

        if (sportInsertError?.code === '23503') {
          logger.warn('profile_sports.upsert stale sport id — refetching padel sport');
          try {
            padelSport = await fetchPadelSportFresh(queryClient);
            sportInsertError = (await upsertProfileSport(padelSport.id)).error;
          } catch (sportError) {
            logger.error('padel sport refetch failed', sportError);
            setSubmitError('Padel sport not found in our system. Please contact support.');
            return;
          }
        }

        if (sportInsertError !== null) {
          logger.error('profile_sports.upsert failed', sportInsertError);
          setSubmitError(sportInsertError.message);
          return;
        }

        // 5. Synchronously flip the root layout's guard state before navigating
        //    so the redirect effect sees profileComplete=true on its next
        //    evaluation and does not bounce the user back to onboarding.
        markProfileComplete();
        router.replace('/(app)/discover');
      })(),
    [handleSubmit, router, markProfileComplete, queryClient],
  );

  return {
    control,
    errors,
    isSubmitting,
    submitError,
    bioValue,
    onSubmit,
  };
}
