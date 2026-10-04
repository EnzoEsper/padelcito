import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useForm, type Control, type FieldErrors } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';

import { logger } from '@/lib/logger';

import { fetchPadelSportFresh } from '@/lib/padel-sport';

import { useOnboardingContext } from '@/lib/onboarding-context';

import { useOnboardingForm } from '@/lib/onboarding-form-context';

import {

  checkUsernameAvailability,

  USERNAME_TAKEN_MESSAGE,

} from '@/features/onboarding/username-availability';



import { padelCategoryFormSchema } from '@/lib/padel-category';

export const usernameFieldSchema = z

  .string()

  .min(3, 'Must be at least 3 characters')

  .max(30, 'Cannot exceed 30 characters')

  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores');



export const usernameSchema = z.object({

  username: usernameFieldSchema,

});



export type UsernameFormData = z.infer<typeof usernameSchema>;



export const padelCategorySchema = padelCategoryFormSchema;

export type PadelCategoryStepFormData = z.infer<typeof padelCategorySchema>;



export type UsernameAvailabilityUiState = 'idle' | 'checking' | 'available' | 'taken' | 'error';



async function fetchCurrentUserId(): Promise<string | null> {

  const { data: authData, error: userError } = await supabase.auth.getUser();

  if (userError !== null || authData.user === null) {

    return null;

  }

  return authData.user.id;

}



function applyUsernameFieldError(

  message: string,

  setError: (name: 'username', error: { message: string }) => void,

): void {

  setError('username', { message });

}



// ─── Step 1: username ─────────────────────────────────────────────────────────



export type UseOnboardingUsernameStepReturn = {

  control: Control<UsernameFormData>;

  errors: FieldErrors<UsernameFormData>;

  isSubmitting: boolean;

  submitError: string | null;

  displayName: string;

  isDisplayNamePending: boolean;

  availabilityState: UsernameAvailabilityUiState;

  onContinue: () => void;

  onUsernameBlur: (username: string) => void;

  onUsernameChange: () => void;

};



export function useOnboardingUsernameStep(): UseOnboardingUsernameStepReturn {

  const router = useRouter();

  const { username: draftUsername, setUsername, step1Feedback, setStep1Feedback } =

    useOnboardingForm();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('Player');

  const [isDisplayNamePending, setIsDisplayNamePending] = useState(true);

  const [availabilityState, setAvailabilityState] = useState<UsernameAvailabilityUiState>('idle');

  const availabilityRequestId = useRef(0);

  const currentUserIdRef = useRef<string | null>(null);



  const {

    control,

    handleSubmit,

    reset,

    setError,

    clearErrors,

    formState: { errors, isSubmitting },

  } = useForm<UsernameFormData>({

    resolver: zodResolver(usernameSchema),

    mode: 'onBlur',

    defaultValues: {

      username: draftUsername,

    },

  });



  useEffect(() => {

    if (draftUsername.length > 0) {

      reset({ username: draftUsername });

    }

  }, [draftUsername, reset]);



  useEffect(() => {

    if (step1Feedback === null) {

      return;

    }



    const fieldMessage = step1Feedback.fieldMessage ?? step1Feedback.message;

    setError('username', { message: fieldMessage });

    setAvailabilityState('taken');

    setStep1Feedback(null);

  }, [setError, setStep1Feedback, step1Feedback]);



  useEffect(() => {

    let cancelled = false;



    void (async () => {

      setIsDisplayNamePending(true);

      const userId = await fetchCurrentUserId();

      if (!cancelled) {

        currentUserIdRef.current = userId;

      }

      if (userId === null) {

        if (!cancelled) {

          setIsDisplayNamePending(false);

        }

        return;

      }



      const { data: profile, error: profileError } = await supabase

        .from('profiles')

        .select('display_name')

        .eq('id', userId)

        .maybeSingle();



      if (cancelled) {

        return;

      }



      if (profileError !== null) {

        logger.error('onboarding: display_name lookup failed', profileError);

        setDisplayName('Player');

      } else {

        setDisplayName(profile?.display_name ?? 'Player');

      }

      setIsDisplayNamePending(false);

    })();



    return () => {

      cancelled = true;

    };

  }, []);



  const runAvailabilityCheck = useCallback(

    async (rawUsername: string): Promise<boolean> => {

      const parsed = usernameFieldSchema.safeParse(rawUsername.trim());

      if (!parsed.success) {

        setAvailabilityState('idle');

        return false;

      }



      const userId = currentUserIdRef.current ?? (await fetchCurrentUserId());

      if (userId === null) {

        setSubmitError('Your session has expired. Please sign in again.');

        setAvailabilityState('error');

        return false;

      }

      currentUserIdRef.current = userId;



      const requestId = availabilityRequestId.current + 1;

      availabilityRequestId.current = requestId;

      setAvailabilityState('checking');

      clearErrors('username');



      const result = await checkUsernameAvailability(parsed.data, userId);



      if (requestId !== availabilityRequestId.current) {

        return false;

      }



      if (result.status === 'available') {

        setAvailabilityState('available');

        setSubmitError(null);

        return true;

      }



      if (result.status === 'taken') {

        applyUsernameFieldError(result.message, setError);

        setAvailabilityState('taken');

        return false;

      }



      applyUsernameFieldError(result.message, setError);

      setAvailabilityState('error');

      return false;

    },

    [clearErrors, setError],

  );



  const onUsernameChange = useCallback(() => {

    availabilityRequestId.current += 1;

    setAvailabilityState('idle');

    setSubmitError(null);

    clearErrors('username');

  }, [clearErrors]);



  const onUsernameBlur = useCallback(

    (username: string) => {

      void runAvailabilityCheck(username);

    },

    [runAvailabilityCheck],

  );



  const onContinue = useCallback(

    () =>

      void handleSubmit(async (data) => {

        setSubmitError(null);

        clearErrors('username');



        const userId = currentUserIdRef.current ?? (await fetchCurrentUserId());

        if (userId === null) {

          setSubmitError('Your session has expired. Please sign in again.');

          return;

        }

        currentUserIdRef.current = userId;



        const trimmed = data.username.trim();

        const isAvailable = await runAvailabilityCheck(trimmed);

        if (!isAvailable) {

          return;

        }



        setUsername(trimmed);

        router.push('/(onboarding)/skill');

      })(),

    [clearErrors, handleSubmit, router, runAvailabilityCheck, setUsername],

  );



  return {

    control,

    errors,

    isSubmitting,

    submitError,

    displayName,

    isDisplayNamePending,

    availabilityState,

    onContinue,

    onUsernameBlur,

    onUsernameChange,

  };

}



function redirectToUsernameStepWithFeedback(

  message: string,

  setStep1Feedback: (feedback: { message: string; fieldMessage?: string } | null) => void,

  router: ReturnType<typeof useRouter>,

): void {

  setStep1Feedback({

    message,

    fieldMessage: message,

  });

  router.replace('/(onboarding)/profile');

}



// ─── Step 2: skill level + save ───────────────────────────────────────────────



export type UseOnboardingSkillStepReturn = {

  control: Control<PadelCategoryStepFormData>;

  errors: FieldErrors<PadelCategoryStepFormData>;

  isSubmitting: boolean;

  submitError: string | null;

  onSubmit: () => void;

};



export function useOnboardingSkillStep(): UseOnboardingSkillStepReturn {

  const router = useRouter();

  const queryClient = useQueryClient();

  const { markProfileComplete } = useOnboardingContext();

  const { username, setStep1Feedback } = useOnboardingForm();

  const [submitError, setSubmitError] = useState<string | null>(null);



  useEffect(() => {

    if (username.length === 0) {

      router.replace('/(onboarding)/profile');

    }

  }, [router, username]);



  const {

    control,

    handleSubmit,

    formState: { errors, isSubmitting },

  } = useForm<PadelCategoryStepFormData>({

    resolver: zodResolver(padelCategorySchema),

    mode: 'onChange',

  });



  const onSubmit = useCallback(

    () =>

      void handleSubmit(async (data) => {

        setSubmitError(null);



        const parsedUsername = usernameFieldSchema.safeParse(username);

        if (!parsedUsername.success) {

          redirectToUsernameStepWithFeedback(

            'Choose a valid handle before continuing.',

            setStep1Feedback,

            router,

          );

          return;

        }



        const userId = await fetchCurrentUserId();

        if (userId === null) {

          setSubmitError('Your session has expired. Please sign in again.');

          return;

        }



        const availability = await checkUsernameAvailability(parsedUsername.data, userId);

        if (availability.status === 'taken') {

          redirectToUsernameStepWithFeedback(availability.message, setStep1Feedback, router);

          return;

        }

        if (availability.status === 'error') {

          redirectToUsernameStepWithFeedback(availability.message, setStep1Feedback, router);

          return;

        }



        const { error: profileError } = await supabase.from('profiles').upsert({

          id: userId,

          username: parsedUsername.data,

        });



        if (profileError !== null) {

          if (profileError.code === '23505') {

            redirectToUsernameStepWithFeedback(USERNAME_TAKEN_MESSAGE, setStep1Feedback, router);

          } else {

            logger.error('profiles.upsert failed', profileError);

            setSubmitError(profileError.message);

          }

          return;

        }



        let padelSport;

        try {

          padelSport = await fetchPadelSportFresh(queryClient);

        } catch (sportError) {

          logger.error('padel sport lookup failed', sportError);

          setSubmitError('Padel sport not found in our system. Please contact support.');

          return;

        }



        const upsertProfileSport = async (sportId: string) =>

          supabase.from('profile_sports').upsert(

            {

              profile_id: userId,

              sport_id: sportId,

              padel_category: data.padel_category,

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



        markProfileComplete();

        router.replace('/(app)/discover');

      })(),

    [handleSubmit, markProfileComplete, queryClient, router, setStep1Feedback, username],

  );



  return {

    control,

    errors,

    isSubmitting,

    submitError,

    onSubmit,

  };

}


