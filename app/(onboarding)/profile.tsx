import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useController, type Control } from 'react-hook-form';

import { View, Text, Pressable, TextInput } from '@/tw';
import { OnboardingStepIndicator } from '@/features/onboarding/onboarding-step-indicator';
import {
  useOnboardingUsernameStep,
  type UsernameAvailabilityUiState,
  type UsernameFormData,
} from '@/features/onboarding/use-onboarding-profile';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';
const BORDER_DEFAULT = 'rgba(228,228,228,0.10)';
const BORDER_FOCUSED = 'rgba(228,228,228,0.60)';
const BORDER_ERROR = 'rgba(224,177,91,0.60)';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
      {children}
    </Text>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <Text className="font-grotesk text-sm text-warning mt-2 leading-5">{message}</Text>
  );
}

function SubmitErrorBanner({ message }: { message: string }) {
  return (
    <View className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 mb-5">
      <Text className="font-grotesk text-sm text-warning leading-5">{message}</Text>
    </View>
  );
}

type UsernameFieldProps = {
  control: Control<UsernameFormData>;
  error: string | undefined;
  availabilityHint: string | null;
  onUsernameBlur: (username: string) => void;
  onUsernameChange: () => void;
};

function UsernameField({
  control,
  error,
  availabilityHint,
  onUsernameBlur,
  onUsernameChange,
}: UsernameFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { field } = useController({ control, name: 'username', defaultValue: '' });

  const hasError = error !== undefined;
  const borderColor = hasError
    ? BORDER_ERROR
    : isFocused
      ? BORDER_FOCUSED
      : BORDER_DEFAULT;

  return (
    <View className="mb-8">
      <SectionLabel>Handle</SectionLabel>
      <View style={[styles.inputRow, { borderColor }]} className="bg-surface-2">
        <Text className="font-mono text-base text-neutral/38 pl-4">@</Text>
        <TextInput
          value={field.value}
          onChangeText={(text) => {
            onUsernameChange();
            field.onChange(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
          }}
          onBlur={() => {
            field.onBlur();
            setIsFocused(false);
            onUsernameBlur(field.value);
          }}
          onFocus={() => setIsFocused(true)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType="done"
          placeholder="your_handle"
          placeholderTextColor={PLACEHOLDER_COLOR}
          className="flex-1 font-grotesk text-base text-neutral px-2 h-full"
        />
      </View>
      <FieldError message={error} />
      {error === undefined && availabilityHint !== null ? (
        <Text className="font-grotesk text-sm text-neutral/60 mt-2 leading-5">{availabilityHint}</Text>
      ) : null}
    </View>
  );
}

function availabilityHintForState(state: UsernameAvailabilityUiState): string | null {
  switch (state) {
    case 'checking':
      return 'Checking availability…';
    case 'available':
      return 'This handle is available.';
    default:
      return null;
  }
}

export default function OnboardingUsernameScreen() {
  const {
    control,
    errors,
    isSubmitting,
    submitError,
    displayName,
    isDisplayNamePending,
    availabilityState,
    onContinue,
    onUsernameBlur,
    onUsernameChange,
  } = useOnboardingUsernameStep();

  const availabilityHint = availabilityHintForState(availabilityState);
  const isContinueDisabled =
    isSubmitting || availabilityState === 'checking' || availabilityState === 'taken';

  const welcomeTitle = isDisplayNamePending
    ? 'Welcome!'
    : `Welcome, ${displayName}!`;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <OnboardingStepIndicator currentStep={1} />

          <View className="mb-10">
            <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-primary-hi mb-3">
              PADELCITO
            </Text>
            <Text className="font-grotesk font-extrabold text-[30px] leading-tight tracking-tight text-neutral">
              {welcomeTitle}
            </Text>
            <Text className="font-grotesk text-base text-neutral/60 mt-2 leading-6">
              Pick a unique handle for your profile.
            </Text>
          </View>

          {submitError !== null && errors.username?.message === undefined ? (
            <SubmitErrorBanner message={submitError} />
          ) : null}

          <UsernameField
            control={control}
            error={errors.username?.message}
            availabilityHint={availabilityHint}
            onUsernameBlur={onUsernameBlur}
            onUsernameChange={onUsernameChange}
          />

          <Pressable
            onPress={onContinue}
            disabled={isContinueDisabled}
            android_ripple={{ color: 'rgba(94,112,184,0.3)' }}
            className={[
              'h-14 rounded-lg items-center justify-center flex-row gap-3',
              isSubmitting ? 'bg-surface-1' : 'bg-primary',
            ].join(' ')}
          >
            {isSubmitting ? (
              <ActivityIndicator color="rgba(228,228,228,0.60)" size="small" />
            ) : null}
            <Text
              className={[
                'font-grotesk font-medium text-base tracking-wide',
                isSubmitting ? 'text-neutral/38' : 'text-neutral',
              ].join(' ')}
            >
              {isSubmitting ? 'CHECKING...' : 'CONTINUE'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  inputRow: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
