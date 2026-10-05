import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from '@/tw';
import { useAuxScreenReturnChain } from '@/lib/app-navigation';
import { usePhoneVerification } from '@/features/profile/phone-verification-provider';
import { VerifyBenefitRow } from '@/features/profile/verify-whatsapp-flow/verify-benefit-row';
import { VerifyFlowLayout } from '@/features/profile/verify-whatsapp-flow/verify-flow-layout';
import { VERIFY_WHATSAPP_PATH } from '@/features/profile/verify-whatsapp-flow/verify-flow-paths';

export default function VerifyWhatsAppIntroScreen() {
  const { goBack, pushWithCurrentAsReturn } = useAuxScreenReturnChain('/(app)/verify-whatsapp-intro');
  const { isVerified, cancelVerifyFlow } = usePhoneVerification();

  useEffect(() => {
    if (isVerified) {
      goBack();
    }
  }, [isVerified, goBack]);

  function handleLater() {
    cancelVerifyFlow();
    goBack();
  }

  function handleContinue() {
    pushWithCurrentAsReturn(VERIFY_WHATSAPP_PATH);
  }

  return (
    <VerifyFlowLayout
      headerRight={
        <Pressable
          onPress={handleLater}
          className="w-11 h-11 rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <Ionicons name="close" size={22} color="#E4E4E4" />
        </Pressable>
      }
      footer={
        <>
          <Pressable
            onPress={handleContinue}
            className="h-[52px] rounded-2xl bg-primary border border-primary-hi/35 items-center justify-center active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel="Continue to verify"
          >
            <Text className="font-grotesk font-semibold text-base text-neutral">Continue</Text>
          </Pressable>
          <Pressable
            onPress={handleLater}
            className="h-11 items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text className="font-grotesk text-[15px] text-primary-hi">Not now</Text>
          </Pressable>
        </>
      }
    >
      <View style={styles.content}>
        <View style={styles.heroBlock}>
          <View style={styles.iconRing}>
            <View style={styles.iconInner}>
              <Ionicons name="chatbubble-ellipses" size={26} color="#5BE0A6" />
            </View>
          </View>

          <Text className="font-mono text-[10px] tracking-[1.4px] uppercase text-neutral/38 mt-5">
            Phone verification
          </Text>
          <Text className="font-grotesk font-extrabold text-[26px] text-neutral text-center mt-2 leading-8">
            Verify your WhatsApp
          </Text>
          <Text className="font-grotesk text-[15px] text-neutral/58 text-center mt-2 leading-[22px] px-1">
            One quick step to host matches, join games, and post in Community.
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={15} color="#5E70B8" />
            <Text className="font-grotesk text-sm text-neutral/50">About 2 minutes</Text>
          </View>
        </View>

        <View style={styles.benefitsCard}>
          <VerifyBenefitRow
            compact
            icon="shield-checkmark-outline"
            title="Confirms you own the number on your profile"
          />
          <VerifyBenefitRow
            compact
            icon="people-outline"
            title="Easier coordination when rosters or plans change"
          />
          <VerifyBenefitRow
            compact
            icon="lock-closed-outline"
            title="Helps keep spam out of the community"
            isLast
          />
        </View>
      </View>
    </VerifyFlowLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  heroBlock: {
    alignItems: 'center',
    paddingTop: 4,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43,57,109,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(94,112,184,0.28)',
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141417',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  benefitsCard: {
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.08)',
    overflow: 'hidden',
  },
});
