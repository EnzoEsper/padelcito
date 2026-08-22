/* eslint-disable import/no-duplicates -- RNGH side-effect import must stay first */
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
/* eslint-enable import/no-duplicates */
import '../src/global.css';

import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
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
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { applyRealtimeAuth, subscribeToAuthChanges } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { initSentry } from '@/lib/sentry';
import { queryClient, persistOptions } from '@/lib/query-client';
import { wireQueryPlatformManagers } from '@/lib/query-focus-manager';
import { AppDialogProvider } from '@/components/app-alert-dialog';
import { OnboardingContext } from '@/lib/onboarding-context';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
initSentry();
wireQueryPlatformManagers();

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
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  const checkProfileComplete = useCallback(async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

      if (error !== null) {
        if (error.code === 'PGRST303') {
          logger.warn('checkProfileComplete: JWT clock skew detected, refreshing session');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError !== null) {
            logger.error('checkProfileComplete: session refresh failed, signing out', refreshError);
            await supabase.auth.signOut();
            return;
          }
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
        setProfileComplete(false);
        return;
      }

      setProfileComplete(data?.username != null);
    } catch (err) {
      logger.error('checkProfileComplete: threw', err);
      setProfileComplete(false);
    }
  }, []);

  const resolvedProfileComplete = session === null ? null : profileComplete;

  useEffect(() => {
    if (session === null) {
      return;
    }
    void checkProfileComplete(session.user.id);
  }, [session, checkProfileComplete]);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await applyRealtimeAuth(data.session?.access_token ?? null);
      setIsReady(true);
    });

    const subscription = subscribeToAuthChanges((_event, newSession) => {
      setSession(newSession);
      void applyRealtimeAuth(newSession?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (session === null) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (resolvedProfileComplete === null) return;

    const inAppGroup = segments[0] === '(app)';

    if (resolvedProfileComplete === false && !inOnboarding) {
      router.replace('/(onboarding)/profile');
    } else if (resolvedProfileComplete === true && !inAppGroup) {
      router.replace('/(app)/profile');
    }
  }, [session, isReady, resolvedProfileComplete, segments, router]);

  useEffect(() => {
    if (fontsLoaded && isReady && (session === null || resolvedProfileComplete !== null)) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady, resolvedProfileComplete, session]);

  const markProfileComplete = useCallback(() => {
    setProfileComplete(true);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <BottomSheetModalProvider>
            <AppDialogProvider>
              <OnboardingContext.Provider value={{ markProfileComplete }}>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }} />
              </OnboardingContext.Provider>
            </AppDialogProvider>
          </BottomSheetModalProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
