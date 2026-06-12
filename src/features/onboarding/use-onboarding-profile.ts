import { useState, useCallback } from 'react';
import { useForm, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

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
  whatsapp_phone: z.string().refine(
    (val) => val === '' || /^\+[1-9][0-9]{6,14}$/.test(val),
    { message: 'Use international format, e.g. +54911XXXXXXXX' },
  ),
  skill_level: z.enum(SKILL_LEVELS),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Location picker hook ─────────────────────────────────────────────────────

export type Coords = { lat: number; lng: number };

export type UseLocationPickerReturn = {
  fetchLocation: () => Promise<void>;
  coords: Coords | null;
  isLocating: boolean;
  locationError: string | null;
};

export function useLocationPicker(): UseLocationPickerReturn {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchLocation = useCallback(async (): Promise<void> => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationError(
          'Location access was denied. You can set your home location later in Settings.',
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err) {
      logger.error('useLocationPicker: fetchLocation threw', err);
      setLocationError('Could not get your location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  return { fetchLocation, coords, isLocating, locationError };
}

// ─── Main onboarding hook ─────────────────────────────────────────────────────

export type UseOnboardingProfileReturn = {
  control: Control<ProfileFormData>;
  errors: FieldErrors<ProfileFormData>;
  isSubmitting: boolean;
  submitError: string | null;
  bioValue: string;
  coords: Coords | null;
  isLocating: boolean;
  locationError: string | null;
  fetchLocation: () => Promise<void>;
  onSubmit: () => void;
};

export function useOnboardingProfile(): UseOnboardingProfileReturn {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { fetchLocation, coords, isLocating, locationError } = useLocationPicker();

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
      whatsapp_phone: '',
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
          // home_location is typed as `unknown` in generated types; WKT is the
          // correct PostgREST format for a geography(point,4326) column.
          home_location:
            coords !== null
              ? (`POINT(${coords.lng} ${coords.lat})` as unknown)
              : undefined,
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

        // 3. Resolve the Padel sport FK
        const { data: sport, error: sportError } = await supabase
          .from('sports')
          .select('id')
          .ilike('name', 'padel')
          .single();

        if (sportError !== null || sport === null) {
          logger.error('padel sport lookup failed', sportError);
          setSubmitError('Padel sport not found in our system. Please contact support.');
          return;
        }

        // 4. Upsert profile_sports (safe if the row already exists)
        const { error: sportInsertError } = await supabase
          .from('profile_sports')
          .upsert(
            {
              profile_id: userId,
              sport_id: sport.id,
              skill_level: data.skill_level,
            },
            { onConflict: 'profile_id,sport_id' },
          );

        if (sportInsertError !== null) {
          logger.error('profile_sports.upsert failed', sportInsertError);
          setSubmitError(sportInsertError.message);
          return;
        }

        // 5. Route to the main app — the root layout guard will pick up the
        //    updated profile on next render and keep the user in /(app).
        router.replace('/(app)');
      })(),
    [handleSubmit, coords, router],
  );

  return {
    control,
    errors,
    isSubmitting,
    submitError,
    bioValue,
    coords,
    isLocating,
    locationError,
    fetchLocation,
    onSubmit,
  };
}
