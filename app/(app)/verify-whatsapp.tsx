import { useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text, TextInput } from '@/tw';
import {
  BACK_BUTTON_SIZE,
  SCREEN_PADDING,
} from '@/components/stack-screen-layout';
import { KEYBOARD_DONE_ACCESSORY_ID } from '@/components/keyboard-done-accessory';
import { useReturnAwareBack } from '@/lib/app-navigation';
import { ARGENTINA_CALLING_CODE } from '@/lib/argentina-whatsapp-phone';
import { usePhoneVerification } from '@/features/profile/phone-verification-provider';
import {
  channelHint,
  useVerifyWhatsAppFlow,
} from '@/features/profile/verify-whatsapp-flow/use-verify-whatsapp-flow';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

function maskLocalPhoneDigits(localDigits: string): string {
  const digits = localDigits.replace(/\D/g, '');
  if (digits.length < 4) {
    return localDigits.length > 0 ? localDigits : 'your number';
  }
  return `••• ••• ${digits.slice(-4)}`;
}

export default function VerifyWhatsAppScreen() {
  const insets = useSafeAreaInsets();
  const goBack = useReturnAwareBack();
  const { whatsappPhone, completeVerifyFlow } = usePhoneVerification();
  const flow = useVerifyWhatsAppFlow(whatsappPhone);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);

  const inputAccessoryId =
    Platform.OS === 'ios' ? KEYBOARD_DONE_ACCESSORY_ID : undefined;

  const headerTop = insets.top + 8;
  const title = flow.step === 'phone' ? 'Your number' : 'Enter the code';
  const subtitle =
    flow.step === 'phone'
      ? 'We send a one-time code on WhatsApp. Argentine mobile only.'
      : channelHint(flow.lastChannel);

  async function onConfirm() {
    Keyboard.dismiss();
    const ok = await flow.handleConfirmCode();
    if (ok) {
      completeVerifyFlow();
    }
  }

  function onSendWhatsApp() {
    Keyboard.dismiss();
    void flow.handleSendCode();
  }

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          goBack();
        }}
        style={[styles.backButton, { top: headerTop, left: SCREEN_PADDING }]}
        className="rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color="#E4E4E4" />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerTop + BACK_BUTTON_SIZE + 12,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-mono text-[10px] tracking-[1.4px] uppercase text-neutral/38">
          Verification
        </Text>
        <Text className="font-grotesk font-extrabold text-[28px] text-neutral mt-2 leading-8">
          {title}
        </Text>
        <Text className="font-grotesk text-sm text-neutral/58 mt-1 leading-5">{subtitle}</Text>

        {flow.step === 'phone' ? (
          <View style={styles.fieldBlock}>
            <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
              Mobile number
            </Text>
            <View style={[styles.phoneRow, phoneFocused && styles.inputFocused]}>
              <Text style={styles.prefix}>{ARGENTINA_CALLING_CODE}</Text>
              <TextInput
                value={flow.localDigits}
                onChangeText={(text) => flow.setLocalDigits(text.replace(/[^\d\s-]/g, ''))}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
                inputAccessoryViewID={inputAccessoryId}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
                placeholder="9 11 2345-6789"
                placeholderTextColor={PLACEHOLDER_COLOR}
                style={styles.phoneInput}
                className="flex-1 font-grotesk text-base text-neutral"
                accessibilityLabel="WhatsApp mobile number"
              />
            </View>
            <Text className="font-grotesk text-xs text-neutral/42 mt-2">
              e.g. 11 2345-6789 (no 0 or 15 prefix)
            </Text>
          </View>
        ) : (
          <View style={styles.fieldBlock}>
            <Text className="font-grotesk text-sm text-neutral/55 mb-3 leading-5">
              {`Sending to ${ARGENTINA_CALLING_CODE} ${maskLocalPhoneDigits(flow.localDigits)}`}
            </Text>
            <Pressable
              onPress={flow.goToPhoneStep}
              className="self-start mb-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Change mobile number"
            >
              <Text className="font-grotesk text-sm text-primary-hi">Change number</Text>
            </Pressable>
            <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
              Verification code
            </Text>
            <TextInput
              value={flow.code}
              onChangeText={(text) => flow.setCode(text.replace(/\D/g, '').slice(0, 8))}
              onFocus={() => setCodeFocused(true)}
              onBlur={() => setCodeFocused(false)}
              keyboardType="number-pad"
              inputAccessoryViewID={inputAccessoryId}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              placeholder="123456"
              placeholderTextColor={PLACEHOLDER_COLOR}
              style={[styles.codeInput, codeFocused && styles.inputFocused]}
              accessibilityLabel="Verification code"
            />
          </View>
        )}

        <View style={styles.actions}>
          {flow.errorMessage !== null ? (
            <Text className="font-grotesk text-sm text-warning leading-5">{flow.errorMessage}</Text>
          ) : null}

          {flow.step === 'phone' ? (
            <>
              <Pressable
                onPress={onSendWhatsApp}
                disabled={flow.isBusy}
                className={[
                  'h-[52px] rounded-2xl items-center justify-center border',
                  flow.isBusy
                    ? 'bg-surface-1 border-neutral/10 opacity-70'
                    : 'bg-primary border-primary-hi/35 active:opacity-90',
                ].join(' ')}
              >
                {flow.isBusy ? (
                  <ActivityIndicator color="#E4E4E4" size="small" />
                ) : (
                  <Text className="font-grotesk font-semibold text-base text-neutral">
                    Send code on WhatsApp
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => void onConfirm()}
                disabled={flow.isBusy}
                className={[
                  'h-[52px] rounded-2xl items-center justify-center border',
                  flow.isBusy
                    ? 'bg-surface-1 border-neutral/10 opacity-70'
                    : 'bg-primary border-primary-hi/35 active:opacity-90',
                ].join(' ')}
              >
                {flow.isBusy ? (
                  <ActivityIndicator color="#E4E4E4" size="small" />
                ) : (
                  <Text className="font-grotesk font-semibold text-base text-neutral">Confirm</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  void flow.handleSendCode({ resend: true });
                }}
                disabled={flow.isBusy}
                className="h-11 items-center justify-center active:opacity-70"
              >
                <Text className="font-grotesk text-[15px] text-primary-hi">Resend code</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
  },
  fieldBlock: {
    marginTop: 24,
  },
  actions: {
    marginTop: 24,
    gap: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
    paddingHorizontal: 16,
    minHeight: 52,
    backgroundColor: '#141417',
  },
  inputFocused: {
    borderColor: 'rgba(228,228,228,0.55)',
  },
  prefix: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    color: 'rgba(228,228,228,0.60)',
    marginRight: 8,
  },
  phoneInput: {
    paddingVertical: 12,
  },
  codeInput: {
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Hanken Grotesk',
    fontSize: 22,
    letterSpacing: 6,
    color: '#E4E4E4',
    backgroundColor: '#141417',
    textAlign: 'center',
  },
});
