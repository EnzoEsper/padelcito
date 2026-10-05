import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter, type Href } from 'expo-router';
import { useProfileContactGate } from '@/features/community/use-posts';
import { pushFromProfileTab } from '@/lib/app-navigation';
import {
  VERIFY_WHATSAPP_INTRO_PATH,
} from '@/features/profile/verify-whatsapp-flow/verify-flow-paths';

type PhoneVerificationContextValue = {
  /** Opens verify flow when needed; runs action after success. No-op when already verified. */
  requireVerifiedWhatsApp: (action: () => void) => void;
  openVerifySheet: () => void;
  cancelVerifyFlow: () => void;
  completeVerifyFlow: () => void;
  isVerified: boolean;
  whatsappPhone: string | null;
};

const PhoneVerificationContext = createContext<PhoneVerificationContextValue | null>(null);

export function PhoneVerificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const contactGate = useProfileContactGate();
  const pendingActionRef = useRef<(() => void) | null>(null);

  const whatsappPhone = contactGate.data?.whatsappPhone ?? null;
  const isVerified = contactGate.data?.whatsappVerified === true;

  const openVerifyIntro = useCallback(() => {
    router.push(VERIFY_WHATSAPP_INTRO_PATH as Href);
  }, [router]);

  const openVerifySheet = useCallback(() => {
    pendingActionRef.current = null;
    pushFromProfileTab(router, VERIFY_WHATSAPP_INTRO_PATH);
  }, [router]);

  const requireVerifiedWhatsApp = useCallback(
    (action: () => void) => {
      if (contactGate.data?.isBanned === true) {
        return;
      }
      if (contactGate.data?.whatsappVerified === true) {
        action();
        return;
      }
      pendingActionRef.current = action;
      openVerifyIntro();
    },
    [contactGate.data?.isBanned, contactGate.data?.whatsappVerified, openVerifyIntro],
  );

  const cancelVerifyFlow = useCallback(() => {
    pendingActionRef.current = null;
  }, []);

  const completeVerifyFlow = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;

    if (router.canGoBack()) {
      router.back();
    }
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      }
      action?.();
    }, 0);
  }, [router]);

  const value = useMemo(
    (): PhoneVerificationContextValue => ({
      requireVerifiedWhatsApp,
      openVerifySheet,
      cancelVerifyFlow,
      completeVerifyFlow,
      isVerified,
      whatsappPhone,
    }),
    [
      requireVerifiedWhatsApp,
      openVerifySheet,
      cancelVerifyFlow,
      completeVerifyFlow,
      isVerified,
      whatsappPhone,
    ],
  );

  return (
    <PhoneVerificationContext.Provider value={value}>{children}</PhoneVerificationContext.Provider>
  );
}

export function usePhoneVerification(): PhoneVerificationContextValue {
  const context = useContext(PhoneVerificationContext);
  if (context === null) {
    throw new Error('usePhoneVerification must be used within PhoneVerificationProvider');
  }
  return context;
}

/** @deprecated Prefer usePhoneVerification().requireVerifiedWhatsApp */
export function useRequireVerifiedWhatsApp() {
  const { requireVerifiedWhatsApp, isVerified, whatsappPhone, openVerifySheet } =
    usePhoneVerification();
  return { requireVerifiedWhatsApp, isVerified, whatsappPhone, openVerifySheet };
}
