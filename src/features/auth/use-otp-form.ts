import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export type AuthStage = 'request' | 'verify';

const RESEND_COOLDOWN_SECONDS = 60;

export type OtpFormReturn = {
  stage: AuthStage;
  identifier: string;
  isLoading: boolean;
  apiError: string | null;
  resendCountdown: number;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (token: string) => Promise<void>;
  resendCode: () => Promise<void>;
  backToRequest: () => void;
};

export function useOtpForm(): OtpFormReturn {
  const [stage, setStage] = useState<AuthStage>('request');
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    stopCountdown();
    setResendCountdown(RESEND_COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopCountdown]);

  useEffect(() => {
    return stopCountdown;
  }, [stopCountdown]);

  const sendOtp = useCallback(
    async (email: string): Promise<boolean> => {
      setIsLoading(true);
      setApiError(null);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) {
          setApiError(error.message);
          return false;
        }
        startCountdown();
        return true;
      } catch (err) {
        logger.error('signInWithOtp threw', err);
        setApiError('Unable to send code. Check your connection and try again.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [startCountdown],
  );

  const requestCode = useCallback(
    async (email: string): Promise<void> => {
      const success = await sendOtp(email);
      if (success) {
        setIdentifier(email);
        setStage('verify');
      }
    },
    [sendOtp],
  );

  const verifyCode = useCallback(
    async (token: string): Promise<void> => {
      setIsLoading(true);
      setApiError(null);
      try {
        const { error } = await supabase.auth.verifyOtp({
          email: identifier,
          token,
          type: 'email',
        });
        if (error) {
          setApiError(error.message);
          return;
        }
        // Session is now live — the root layout's onAuthStateChange listener
        // will detect the new session and route to /(app).
        stopCountdown();
      } catch (err) {
        logger.error('verifyOtp threw', err);
        setApiError('Verification failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [identifier, stopCountdown],
  );

  const resendCode = useCallback(async (): Promise<void> => {
    if (resendCountdown > 0 || !identifier) return;
    await sendOtp(identifier);
  }, [resendCountdown, identifier, sendOtp]);

  const backToRequest = useCallback(() => {
    setStage('request');
    setApiError(null);
    stopCountdown();
  }, [stopCountdown]);

  return {
    stage,
    identifier,
    isLoading,
    apiError,
    resendCountdown,
    requestCode,
    verifyCode,
    resendCode,
    backToRequest,
  };
}
