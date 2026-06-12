import '../src/global.css';

import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { subscribeToAuthChanges } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { OnboardingContext } from '@/lib/onboarding-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Hanken Grotesk': HankenGrotesk_400Regular,
    'HankenGrotesk-Medium': HankenGrotesk_500Medium,
    'HankenGrotesk-Bold': HankenGrotesk_700Bold,
    'HankenGrotesk-ExtraBold': HankenGrotesk_800ExtraBold,
    'Space Mono': SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
  });

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
        // PGRST303 means the stored JWT's iat is ahead of the server clock (clock
        // skew — common in dev when Metro restarts). Refresh the session to get a
        // new token, then retry once before giving up.
        if (error.code === 'PGRST303') {
          logger.warn('checkProfileComplete: JWT clock skew detected, refreshing session');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError !== null) {
            logger.error('checkProfileComplete: session refresh failed, signing out', refreshError);
            await supabase.auth.signOut();
            return;
          }
          // Retry with the fresh token.
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .maybeSingle();
          if (retryError !== null) {
            logger.error('checkProfileComplete: retry failed', retryError);
            setProfileComplete(false);
            return;
          }
          setProfileComplete(retryData?.username != null);
          return;
        }

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

    const inAppGroup = segments[0] === '(app)';

    if (profileComplete === false && !inOnboarding) {
      router.replace('/(onboarding)/profile');
    } else if (profileComplete === true && !inAppGroup) {
      // Redirect from anywhere outside the app shell: (auth), (onboarding),
      // or the root index (cold-start with a cached session).
      router.replace('/(app)/profile');
    }
  }, [session, isReady, profileComplete, segments, router]);

  // Synchronously marks the profile as complete. Called by the onboarding
  // screen immediately after the DB writes succeed, before router.replace,
  // so the redirect guard sees the correct state on the very next evaluation.
  const markProfileComplete = useCallback(() => {
    setProfileComplete(true);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingContext.Provider value={{ markProfileComplete }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </OnboardingContext.Provider>
    </QueryClientProvider>
  );
}
