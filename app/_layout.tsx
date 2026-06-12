import '../src/global.css';

import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { subscribeToAuthChanges } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { OnboardingContext } from '@/lib/onboarding-context';

// TODO(Step 1.3): Load Hanken Grotesk + Space Mono fonts here via expo-font
// before rendering children, so typography tokens resolve correctly on all platforms.

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  // null = still checking; false = no username; true = profile complete
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Queries the profiles table to determine whether the user has completed
  // onboarding. "Complete" is defined as having a non-null username.
  const checkProfileComplete = useCallback(async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

      if (error !== null) {
        logger.error('checkProfileComplete: query failed', error);
        // Safest fallback: treat as incomplete so the user can set up their profile.
        setProfileComplete(false);
        return;
      }

      setProfileComplete(data?.username != null);
    } catch (err) {
      logger.error('checkProfileComplete: threw', err);
      setProfileComplete(false);
    }
  }, []);

  // Re-check profile completeness whenever the session identity changes.
  useEffect(() => {
    if (session === null) {
      // Reset so the check runs fresh on the next sign-in.
      setProfileComplete(null);
      return;
    }
    void checkProfileComplete(session.user.id);
  }, [session, checkProfileComplete]);

  useEffect(() => {
    // Hydrate session from secure storage on first mount.
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsReady(true);
    });

    const subscription = subscribeToAuthChanges((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    // No session → always send to login (no need to wait for profileComplete).
    if (session === null) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Session exists — wait for profile check before redirecting.
    if (profileComplete === null) return;

    if (profileComplete === false && !inOnboarding) {
      router.replace('/(onboarding)/profile');
    } else if (profileComplete === true && (inAuthGroup || inOnboarding)) {
      router.replace('/(app)');
    }
  }, [session, isReady, profileComplete, segments, router]);

  // Synchronously marks the profile as complete. Called by the onboarding
  // screen immediately after the DB writes succeed, before router.replace,
  // so the redirect guard sees the correct state on the very next evaluation.
  const markProfileComplete = useCallback(() => {
    setProfileComplete(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{ markProfileComplete }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingContext.Provider>
  );
}
