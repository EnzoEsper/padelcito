import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toUserFacingError } from '@/lib/error-message';

type GoogleSigninModule =
  typeof import('@react-native-google-signin/google-signin');

function loadGoogleSigninModule(): GoogleSigninModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(
      '@react-native-google-signin/google-signin',
    ) as GoogleSigninModule;
  } catch {
    return null;
  }
}

const googleSigninModule = loadGoogleSigninModule();

let googleConfigured = false;

function ensureGoogleConfigured(): boolean {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  if (webClientId === undefined || webClientId.length === 0) {
    return false;
  }

  if (Platform.OS === 'ios' && (iosClientId === undefined || iosClientId.length === 0)) {
    return false;
  }

  if (googleSigninModule !== null && !googleConfigured) {
    googleSigninModule.GoogleSignin.configure({
      webClientId,
      ...(iosClientId !== undefined ? { iosClientId } : {}),
    });
    googleConfigured = true;
  }

  return googleSigninModule !== null;
}

export type GoogleSignInReturn = {
  isLoading: boolean;
  googleError: string | null;
  isNativeAvailable: boolean;
  isConfigured: boolean;
  handleGoogleSignIn: () => Promise<void>;
};

function hasCode(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

export function useGoogleSignIn(): GoogleSignInReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const isConfigured = ensureGoogleConfigured();
  const isNativeAvailable = googleSigninModule !== null && isConfigured;

  const handleGoogleSignIn = useCallback(async (): Promise<void> => {
    if (!ensureGoogleConfigured() || googleSigninModule === null) {
      setGoogleError(
        'Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment.',
      );
      return;
    }

    const { GoogleSignin, statusCodes } = googleSigninModule;

    setIsLoading(true);
    setGoogleError(null);

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        setGoogleError(
          'Google sign-in did not return a token. Please try again.',
        );
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        logger.error('signInWithIdToken(google) failed', error);
        setGoogleError(toUserFacingError(error, 'Google sign-in failed. Please try again.'));
        return;
      }
    } catch (err) {
      if (hasCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        if (err.code === statusCodes.IN_PROGRESS) {
          return;
        }
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setGoogleError('Google Play Services are unavailable on this device.');
          return;
        }
      }

      logger.error('handleGoogleSignIn threw', err);
      setGoogleError('Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, googleError, isNativeAvailable, isConfigured, handleGoogleSignIn };
}
