import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { toUserFacingError } from '@/lib/error-message';
import { logger } from '@/lib/logger';

export type AppleSignInReturn = {
  isLoading: boolean;
  appleError: string | null;
  isAvailable: boolean;
  handleAppleSignIn: () => Promise<void>;
};

export function useAppleSignIn(): AppleSignInReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsAvailable(false);
      return;
    }

    void AppleAuthentication.isAvailableAsync()
      .then(setIsAvailable)
      .catch(() => {
        setIsAvailable(false);
      });
  }, []);

  const handleAppleSignIn = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      setAppleError('Sign in with Apple is only available on iOS.');
      return;
    }

    setIsLoading(true);
    setAppleError(null);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken === null || credential.identityToken.length === 0) {
        setAppleError('Apple sign-in did not return a token. Please try again.');
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error !== null) {
        logger.error('signInWithIdToken(apple) failed', error);
        setAppleError(toUserFacingError(error, 'Apple sign-in failed. Please try again.'));
      }
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }

      logger.error('handleAppleSignIn threw', err);
      setAppleError('Apple sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, appleError, isAvailable, handleAppleSignIn };
}
