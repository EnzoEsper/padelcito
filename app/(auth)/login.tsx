import { useRef, useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { View, Text, Pressable, TextInput, ScrollView } from '@/tw';
import { useOtpForm, type AuthStage } from '@/features/auth/use-otp-form';
import { useGoogleSignIn } from '@/features/auth/use-google-sign-in';

// ─── Validation schemas ──────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

const otpSchema = z.object({
  token: z.string().regex(/^\d{6}$/, 'Enter the complete 6-digit code'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
      {children}
    </Text>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <Text className="font-grotesk text-sm text-warning mt-2 leading-5">
      {message}
    </Text>
  );
}

function ApiErrorBanner({ message }: { message: string }) {
  return (
    <View className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3">
      <Text className="font-grotesk text-sm text-warning leading-5">{message}</Text>
    </View>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────

type PrimaryButtonProps = {
  onPress: () => void;
  isLoading: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel?: string;
};

function PrimaryButton({
  onPress,
  isLoading,
  disabled = false,
  label,
  loadingLabel = 'SENDING...',
}: PrimaryButtonProps) {
  const isDisabled = isLoading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(94,112,184,0.3)' }}
      className={[
        'h-14 rounded-lg items-center justify-center',
        isDisabled ? 'bg-surface-1' : 'bg-primary',
      ].join(' ')}
    >
      <Text
        className={[
          'font-grotesk font-medium text-base tracking-wide',
          isDisabled ? 'text-neutral/38' : 'text-neutral',
        ].join(' ')}
      >
        {isLoading ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

// ─── OR divider ───────────────────────────────────────────────────────────────

function OrDivider() {
  return (
    <View className="flex-row items-center gap-3 my-6">
      <View className="flex-1 h-px bg-neutral/10" />
      <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/38">
        OR
      </Text>
      <View className="flex-1 h-px bg-neutral/10" />
    </View>
  );
}

// ─── Google sign-in button ────────────────────────────────────────────────────

type GoogleButtonProps = {
  onPress: () => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
};

function GoogleButton({
  onPress,
  isLoading,
  disabled = false,
}: GoogleButtonProps) {
  const isDisabled = isLoading || disabled;

  return (
    <Pressable
      onPress={() => void onPress()}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(228,228,228,0.06)' }}
      className={[
        'h-14 rounded-lg border border-neutral/10 bg-surface-2',
        'flex-row items-center justify-center gap-3',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {isLoading ? (
        <ActivityIndicator color="#E4E4E4" size="small" />
      ) : (
        <View className="w-6 h-6 rounded-full bg-surface-3 items-center justify-center">
          <Text className="font-mono text-xs text-neutral/60 leading-none">
            G
          </Text>
        </View>
      )}
      <Text
        className={[
          'font-mono text-[11px] tracking-[0.13em] uppercase',
          isLoading ? 'text-neutral/38' : 'text-neutral',
        ].join(' ')}
      >
        {isLoading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
      </Text>
    </Pressable>
  );
}

// ─── 6-cell OTP input ─────────────────────────────────────────────────────────

type OtpCellInputProps = {
  value: string;
  onChange: (text: string) => void;
  hasError: boolean;
  disabled?: boolean;
  onComplete?: () => void;
};

function OtpCellInput({
  value,
  onChange,
  hasError,
  disabled = false,
  onComplete,
}: OtpCellInputProps) {
  const hiddenInputRef = useRef<RNTextInput>(null);

  const activeCellIndex = value.length === 6 ? -1 : value.length;

  const handleChangeText = (text: string) => {
    const sanitized = text.replace(/\D/g, '').slice(0, 6);
    onChange(sanitized);
    if (sanitized.length === 6) {
      hiddenInputRef.current?.blur();
      onComplete?.();
    }
  };

  return (
    <Pressable
      onPress={() => {
        if (!disabled) hiddenInputRef.current?.focus();
      }}
      disabled={disabled}
    >
      <View className="flex-row gap-2">
        {Array.from({ length: 6 }, (_, index) => {
          const char = index < value.length ? value[index] : '';
          const isFilled = index < value.length;
          const isActive = index === activeCellIndex;

          let borderClass = 'border-neutral/10';
          if (hasError && isFilled) {
            borderClass = 'border-warning/60';
          } else if (isActive) {
            borderClass = 'border-neutral/40';
          } else if (isFilled) {
            borderClass = 'border-primary-hi/60';
          }

          return (
            <View
              key={index}
              className={[
                'flex-1 h-14 rounded-lg border items-center justify-center bg-surface-1',
                borderClass,
                disabled ? 'opacity-50' : '',
              ].join(' ')}
            >
              <Text className="font-mono text-xl text-neutral tracking-tight">
                {char}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Hidden input — captures keypresses and forwards to the visual cells */}
      <RNTextInput
        ref={hiddenInputRef}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={6}
        caretHidden
        editable={!disabled}
        style={styles.hiddenOtpInput}
      />
    </Pressable>
  );
}

// ─── Resend row ───────────────────────────────────────────────────────────────

type ResendRowProps = {
  countdown: number;
  onResend: () => Promise<void>;
};

function ResendRow({ countdown, onResend }: ResendRowProps) {
  const canResend = countdown === 0;
  const padded = String(countdown).padStart(2, '0');

  return (
    <View className="flex-row items-center justify-center gap-1 mt-5">
      <Text className="font-grotesk text-sm text-neutral/60">
        Didn{"'"}t receive it?
      </Text>
      {canResend ? (
        <Pressable
          onPress={() => void onResend()}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text className="font-grotesk text-sm text-primary-hi font-medium">
            Resend code
          </Text>
        </Pressable>
      ) : (
        <Text className="font-mono text-xs text-neutral/38 tracking-wider">
          {`Resend in 00:${padded}`}
        </Text>
      )}
    </View>
  );
}

// ─── Email step ───────────────────────────────────────────────────────────────

type EmailStepProps = {
  isLoading: boolean;
  onSubmit: (email: string) => Promise<void>;
};

function EmailStep({ isLoading, onSubmit }: EmailStepProps) {
  const [isFocused, setIsFocused] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    mode: 'onSubmit',
  });

  const { field } = useController({
    control,
    name: 'email',
    defaultValue: '',
  });

  const submit = useCallback(
    () =>
      void handleSubmit(async ({ email }) => {
        await onSubmit(email);
      })(),
    [handleSubmit, onSubmit],
  );

  return (
    <View>
      <View className="mb-6">
        <FieldLabel>Email Address</FieldLabel>
        <TextInput
          value={field.value}
          onChangeText={(text) => field.onChange(text)}
          onBlur={() => {
            field.onBlur();
            setIsFocused(false);
          }}
          onFocus={() => setIsFocused(true)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={submit}
          placeholder="you@example.com"
          placeholderTextColor="rgba(228,228,228,0.2)"
          className={[
            'h-14 bg-surface-1 rounded-lg px-4',
            'font-grotesk text-base text-neutral',
            'border',
            isFocused ? 'border-primary-hi/40' : 'border-neutral/10',
          ].join(' ')}
        />
        <FieldError message={errors.email?.message} />
      </View>

      <PrimaryButton
        onPress={submit}
        isLoading={isLoading}
        label="SEND CODE"
        loadingLabel="SENDING..."
      />
    </View>
  );
}

// ─── OTP step ─────────────────────────────────────────────────────────────────

type OtpStepProps = {
  isLoading: boolean;
  identifier: string;
  resendCountdown: number;
  onVerify: (token: string) => Promise<void>;
  onResend: () => Promise<void>;
};

function OtpStep({
  isLoading,
  resendCountdown,
  onVerify,
  onResend,
}: OtpStepProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
  });

  const { field, fieldState } = useController({
    control,
    name: 'token',
    defaultValue: '',
  });

  const submit = useCallback(
    () =>
      void handleSubmit(async ({ token }) => {
        await onVerify(token);
      })(),
    [handleSubmit, onVerify],
  );

  return (
    <View>
      <View className="mb-6">
        <FieldLabel>6-Digit Code</FieldLabel>
        <OtpCellInput
          value={field.value}
          onChange={(text) => field.onChange(text)}
          hasError={!!fieldState.error}
          disabled={isLoading}
          onComplete={submit}
        />
        <FieldError message={errors.token?.message} />
      </View>

      <PrimaryButton
        onPress={submit}
        isLoading={isLoading}
        disabled={!isValid}
        label="VERIFY CODE"
        loadingLabel="VERIFYING..."
      />

      <ResendRow countdown={resendCountdown} onResend={onResend} />
    </View>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

const FORM_AREA_HEIGHT = 290;

export default function LoginScreen() {
  const {
    stage,
    identifier,
    isLoading,
    apiError,
    resendCountdown,
    requestCode,
    verifyCode,
    resendCode,
    backToRequest,
  } = useOtpForm();

  const {
    isLoading: googleIsLoading,
    googleError,
    isNativeAvailable,
    handleGoogleSignIn,
  } = useGoogleSignIn();

  // Animation values are stored in a stable ref object so they never
  // appear as stale closures in the useEffect dependency array.
  const anims = useRef({
    requestOpacity: new Animated.Value(1),
    requestTranslateX: new Animated.Value(0),
    verifyOpacity: new Animated.Value(0),
    verifyTranslateX: new Animated.Value(32),
  }).current;

  const prevStageRef = useRef<AuthStage>(stage);

  useEffect(() => {
    if (prevStageRef.current === stage) return;
    prevStageRef.current = stage;

    if (stage === 'verify') {
      // Snap verify to its "off-screen right" start position, then slide in.
      anims.verifyTranslateX.setValue(32);
      anims.verifyOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(anims.requestOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(anims.requestTranslateX, {
          toValue: -32,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(anims.verifyOpacity, {
          toValue: 1,
          duration: 220,
          delay: 80,
          useNativeDriver: true,
        }),
        Animated.timing(anims.verifyTranslateX, {
          toValue: 0,
          duration: 220,
          delay: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Snap request to its "off-screen left" start position, then slide in.
      anims.requestTranslateX.setValue(-32);
      anims.requestOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(anims.verifyOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(anims.verifyTranslateX, {
          toValue: 32,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(anims.requestOpacity, {
          toValue: 1,
          duration: 220,
          delay: 80,
          useNativeDriver: true,
        }),
        Animated.timing(anims.requestTranslateX, {
          toValue: 0,
          duration: 220,
          delay: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [stage, anims]);

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-8 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back button row (collapses to empty space in request stage) ── */}
          <View style={styles.backRow}>
            {stage === 'verify' && (
              <Pressable
                onPress={backToRequest}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="flex-row items-center gap-2"
              >
                <Text className="text-neutral/60 text-lg leading-none">←</Text>
                <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60">
                  Back
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Brand area ───────────────────────────────────────────────── */}
          <View className="mb-10">
            <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-primary-hi mb-3">
              PADELCITO
            </Text>
            <Text className="font-grotesk font-extrabold text-[30px] leading-tight tracking-tight text-neutral">
              {stage === 'request' ? 'Sign in' : 'Check your inbox'}
            </Text>
            <Text className="font-grotesk text-base text-neutral/60 mt-2 leading-6">
              {stage === 'request'
                ? 'Enter your email to receive a one-time code.'
                : `We sent a 6-digit code to ${identifier}`}
            </Text>
          </View>

          {/* ── Animated form area ───────────────────────────────────────── */}
          {/* Both stages are mounted simultaneously. The inactive one is
              invisible (opacity 0) and non-interactive (pointerEvents none),
              ensuring the react-hook-form state for each step is preserved
              throughout the transition animation. */}
          <View style={styles.formArea}>
            {/* Request step */}
            <Animated.View
              style={[
                styles.absoluteFill,
                {
                  opacity: anims.requestOpacity,
                  transform: [{ translateX: anims.requestTranslateX }],
                },
              ]}
              pointerEvents={stage === 'request' ? 'auto' : 'none'}
            >
              <EmailStep isLoading={isLoading} onSubmit={requestCode} />
            </Animated.View>

            {/* Verify step */}
            <Animated.View
              style={[
                styles.absoluteFill,
                {
                  opacity: anims.verifyOpacity,
                  transform: [{ translateX: anims.verifyTranslateX }],
                },
              ]}
              pointerEvents={stage === 'verify' ? 'auto' : 'none'}
            >
              <OtpStep
                isLoading={isLoading}
                identifier={identifier}
                resendCountdown={resendCountdown}
                onVerify={verifyCode}
                onResend={resendCode}
              />
            </Animated.View>
          </View>

          {/* ── OTP API error ────────────────────────────────────────────── */}
          {apiError !== null && (
            <View className="mt-4">
              <ApiErrorBanner message={apiError} />
            </View>
          )}

          {/* ── Google sign-in (request stage only) ──────────────────────── */}
          {stage === 'request' && (
            <>
              <OrDivider />
              <GoogleButton
                onPress={handleGoogleSignIn}
                isLoading={googleIsLoading}
                disabled={isLoading || !isNativeAvailable}
              />
              {!isNativeAvailable && (
                <Text className="font-mono text-[10px] tracking-widest uppercase text-neutral/38 text-center mt-3">
                  Requires an EAS development client
                </Text>
              )}
              {googleError !== null && (
                <View className="mt-4">
                  <ApiErrorBanner message={googleError} />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Static styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  flex: {
    flex: 1,
  },
  backRow: {
    height: 48,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  formArea: {
    height: FORM_AREA_HEIGHT,
    position: 'relative',
  },
  absoluteFill: {
    position: 'absolute',
    width: '100%',
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
});
