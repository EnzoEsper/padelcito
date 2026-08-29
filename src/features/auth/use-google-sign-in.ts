import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// ─── Lazy native module loading ───────────────────────────────────────────────
//
// @react-native-google-signin calls TurboModuleRegistry.getEnforcing() at
// require-time, which throws synchronously in Expo Go (the 'RNGoogleSignin'
// TurboModule is not registered in its binary). Wrapping the require in a
// try/catch prevents that crash from propagating to login.tsx and breaking
// the entire auth screen. In a proper EAS development client the module loads
// normally and Google Sign-In is fully functional.

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

// ─── Configuration ────────────────────────────────────────────────────────────

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (!webClientId) {
  throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID env var');
}

if (Platform.OS === 'ios' && !iosClientId) {
  throw new Error('Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID env var');
}

// Configure once at module load — idempotent, safe to call outside a hook.
// Skipped when the native module is unavailable (e.g. Expo Go).
if (googleSigninModule) {
  googleSigninModule.GoogleSignin.configure({
    webClientId,
    ...(iosClientId !== undefined ? { iosClientId } : {}),
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoogleSignInReturn = {
  isLoading: boolean;
  googleError: string | null;
  isNativeAvailable: boolean;
  handleGoogleSignIn: () => Promise<void>;
};

// ─── Type guard ───────────────────────────────────────────────────────────────

function hasCode(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGoogleSignIn(): GoogleSignInReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const isNativeAvailable = googleSigninModule !== null;

  const handleGoogleSignIn = useCallback(async (): Promise<void> => {
    if (!googleSigninModule) {
      setGoogleError(
        'Google Sign-In is not available in Expo Go. Build a development client with EAS to test this feature.',
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
        setGoogleError(error.message);
        return;
      }

      // Session is now live — the root layout's onAuthStateChange listener
      // will detect the new session and route to /(app).
    } catch (err) {
      if (hasCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          // User dismissed the picker — not an error.
          return;
        }
        if (err.code === statusCodes.IN_PROGRESS) {
          // A sign-in is already underway — ignore.
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

  return { isLoading, googleError, isNativeAvailable, handleGoogleSignIn };
}
