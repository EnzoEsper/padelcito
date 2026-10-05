import { useEffect, useRef, useState } from 'react';
import {
  formatArgentinaWhatsAppLocalInput,
  parseArgentinaWhatsAppLocalToNullableE164,
  parseArgentinaWhatsAppToE164,
  tryParseArgentinaWhatsAppToE164,
} from '@/lib/argentina-whatsapp-phone';
import { useUpdateProfileWhatsApp } from '@/features/profile/use-profile';
import {
  useCheckPhoneVerification,
  useStartPhoneVerification,
} from '@/features/profile/use-phone-verification';

export type VerifyWhatsAppStep = 'phone' | 'code';

export function channelHint(channel: 'whatsapp' | 'dev' | null): string {
  if (channel === 'dev') {
    return 'Local dev mode: enter 000000 to verify (no message sent).';
  }
  if (channel === 'whatsapp') {
    return 'We sent a code on WhatsApp. Enter it below.';
  }
  return 'We will send a one-time code on WhatsApp to confirm you own this number.';
}

export function useVerifyWhatsAppFlow(initialPhoneE164: string | null) {
  const [localDigits, setLocalDigits] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<VerifyWhatsAppStep>('phone');
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [lastChannel, setLastChannel] = useState<'whatsapp' | 'dev' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateWhatsApp = useUpdateProfileWhatsApp();
  const startVerification = useStartPhoneVerification();
  const checkVerification = useCheckPhoneVerification();

  const isBusy =
    updateWhatsApp.isPending || startVerification.isPending || checkVerification.isPending;
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }
    bootstrappedRef.current = true;
    setErrorMessage(null);
    setCode('');
    setStep('phone');
    setLastChannel(null);

    if (initialPhoneE164 !== null && initialPhoneE164.length > 0) {
      const canonical = tryParseArgentinaWhatsAppToE164(initialPhoneE164);
      if (canonical !== null) {
        setActivePhone(canonical);
        setLocalDigits(formatArgentinaWhatsAppLocalInput(canonical));
      } else {
        setActivePhone(null);
        setLocalDigits(formatArgentinaWhatsAppLocalInput(initialPhoneE164));
        setErrorMessage(
          'Update your WhatsApp to a valid mobile number, or enter it below.',
        );
      }
    } else {
      setActivePhone(null);
      setLocalDigits('');
    }
  }, [initialPhoneE164]);

  function resolvePhoneE164(): string | null {
    if (activePhone !== null && activePhone.length > 0) {
      const canonical = tryParseArgentinaWhatsAppToE164(activePhone);
      if (canonical !== null) {
        return canonical;
      }
    }

    try {
      const fromLocal = parseArgentinaWhatsAppLocalToNullableE164(localDigits);
      if (fromLocal !== null) {
        return fromLocal;
      }
    } catch {
      // fall through
    }

    setErrorMessage(
      'Enter a valid Argentine mobile (e.g. 11 2345-6789). Dev code 000000 is entered after Send.',
    );
    return null;
  }

  async function handleSendCode(options?: { resend?: boolean }): Promise<void> {
    setErrorMessage(null);
    const parsed = parseArgentinaWhatsAppToE164(
      localDigits.length > 0 ? localDigits : (activePhone ?? ''),
    );
    if (!parsed.ok || parsed.e164.length === 0) {
      setErrorMessage(parsed.ok ? 'Enter your mobile number.' : parsed.message);
      return;
    }

    const resend = options?.resend === true;

    try {
      if (initialPhoneE164 !== parsed.e164) {
        await updateWhatsApp.mutateAsync({ whatsapp_phone: parsed.e164 });
      }
      const result = await startVerification.mutateAsync({
        phone: parsed.e164,
        resend: resend ? true : undefined,
      });
      setActivePhone(parsed.e164);
      setLastChannel(result.channel === 'dev' ? 'dev' : 'whatsapp');
      setStep('code');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not send verification code.';
      setErrorMessage(message);
    }
  }

  async function handleConfirmCode(): Promise<boolean> {
    setErrorMessage(null);
    const phone = resolvePhoneE164();
    if (phone === null) {
      return false;
    }
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setErrorMessage('Enter the verification code.');
      return false;
    }

    try {
      await checkVerification.mutateAsync({ phone, code: trimmed });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid verification code.';
      setErrorMessage(message);
      return false;
    }
  }

  function goToPhoneStep(): void {
    setErrorMessage(null);
    setCode('');
    setStep('phone');
    setLastChannel(null);
  }

  return {
    step,
    localDigits,
    setLocalDigits,
    code,
    setCode,
    lastChannel,
    errorMessage,
    isBusy,
    handleSendCode,
    handleConfirmCode,
    goToPhoneStep,
  };
}
