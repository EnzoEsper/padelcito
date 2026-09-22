import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useController } from 'react-hook-form';

import { View, Text, Pressable, TextInput, ScrollView } from '@/tw';
import {
  useOnboardingProfile,
  formatArgentinaWhatsAppLocal,
  composeArgentinaWhatsAppPhone,
  TEMP_ARGENTINA_WHATSAPP_PREFIX,
  TEMP_DEFAULT_WHATSAPP_LOCAL,
  type ProfileFormData,
} from '@/features/onboarding/use-onboarding-profile';
import type { Control } from 'react-hook-form';
import { PlayingProfileFields } from '@/features/profile/playing-profile-fields';
import { DemographicsFields } from '@/features/profile/demographics-fields';
import { SkillLevelChips } from '@/features/profile/skill-level-chips';

// ─── Design tokens ────────────────────────────────────────────────────────────

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';
const BORDER_DEFAULT = 'rgba(228,228,228,0.10)';
const BORDER_FOCUSED = 'rgba(228,228,228,0.60)';
const BORDER_ERROR = 'rgba(224,177,91,0.60)';

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
      {children}
    </Text>
  );
}

// ─── Field error ──────────────────────────────────────────────────────────────

function FieldError({ message }: { message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <Text className="font-grotesk text-sm text-warning mt-2 leading-5">{message}</Text>
  );
}

// ─── Submit error banner ──────────────────────────────────────────────────────

function SubmitErrorBanner({ message }: { message: string }) {
  return (
    <View className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 mb-5">
      <Text className="font-grotesk text-sm text-warning leading-5">{message}</Text>
    </View>
  );
}

// ─── Username field ───────────────────────────────────────────────────────────

type UsernameFieldProps = {
  control: Control<ProfileFormData>;
  error: string | undefined;
};

function UsernameField({ control, error }: UsernameFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { field } = useController({ control, name: 'username', defaultValue: '' });

  const borderColor = error
    ? BORDER_ERROR
    : isFocused
      ? BORDER_FOCUSED
      : BORDER_DEFAULT;

  return (
    <View className="mb-6">
      <SectionLabel>Handle</SectionLabel>
      <View
        style={[styles.inputRow, { borderColor }]}
        className="bg-surface-2"
      >
        <Text className="font-mono text-base text-neutral/38 pl-4">@</Text>
        <TextInput
          value={field.value}
          onChangeText={(text) => field.onChange(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          onBlur={() => { field.onBlur(); setIsFocused(false); }}
          onFocus={() => setIsFocused(true)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType="next"
          placeholder="your_handle"
          placeholderTextColor={PLACEHOLDER_COLOR}
          className="flex-1 font-grotesk text-base text-neutral px-2 h-full"
        />
      </View>
      <FieldError message={error} />
    </View>
  );
}

// ─── Bio field ────────────────────────────────────────────────────────────────

type BioFieldProps = {
  control: Control<ProfileFormData>;
  error: string | undefined;
  charCount: number;
};

function BioField({ control, error, charCount }: BioFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { field } = useController({ control, name: 'bio', defaultValue: '' });

  const borderColor = error
    ? BORDER_ERROR
    : isFocused
      ? BORDER_FOCUSED
      : BORDER_DEFAULT;

  return (
    <View className="mb-6">
      <SectionLabel>Bio — Optional</SectionLabel>
      <TextInput
        value={field.value}
        onChangeText={(text) => field.onChange(text)}
        onBlur={() => { field.onBlur(); setIsFocused(false); }}
        onFocus={() => setIsFocused(true)}
        multiline
        maxLength={500}
        numberOfLines={3}
        textAlignVertical="top"
        placeholder="Tell other players about yourself..."
        placeholderTextColor={PLACEHOLDER_COLOR}
        style={[styles.bioInput, { borderColor }]}
        className="bg-surface-2 font-grotesk text-base text-neutral"
      />
      <View className="flex-row justify-between mt-2">
        <FieldError message={error} />
        <Text className="font-mono text-[11px] tracking-[0.13em] text-neutral/38 ml-auto">
          {charCount} / 500
        </Text>
      </View>
    </View>
  );
}

// ─── WhatsApp field ───────────────────────────────────────────────────────────

type WhatsAppFieldProps = {
  control: Control<ProfileFormData>;
  error: string | undefined;
};

function WhatsAppField({ control, error }: WhatsAppFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { field } = useController({
    control,
    name: 'whatsapp_phone',
    defaultValue: composeArgentinaWhatsAppPhone(TEMP_DEFAULT_WHATSAPP_LOCAL),
  });

  const borderColor = error
    ? BORDER_ERROR
    : isFocused
      ? BORDER_FOCUSED
      : BORDER_DEFAULT;

  const localValue = formatArgentinaWhatsAppLocal(field.value);

  return (
    <View className="mb-6">
      <SectionLabel>WhatsApp — Optional</SectionLabel>
      <View
        style={[styles.inputRow, { borderColor }]}
        className="bg-surface-2"
      >
        <Text className="font-mono text-base text-neutral/60 pl-4">
          {TEMP_ARGENTINA_WHATSAPP_PREFIX}
        </Text>
        <TextInput
          value={localValue}
          onChangeText={(text) => field.onChange(composeArgentinaWhatsAppPhone(text))}
          onBlur={() => { field.onBlur(); setIsFocused(false); }}
          onFocus={() => setIsFocused(true)}
          keyboardType="phone-pad"
          autoComplete="tel"
          returnKeyType="done"
          placeholder="911XXXXXXXX"
          placeholderTextColor={PLACEHOLDER_COLOR}
          className="flex-1 font-grotesk text-base text-neutral px-2 h-full"
        />
      </View>
      <FieldError message={error} />
    </View>
  );
}

// ─── Profile setup screen ─────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const {
    control,
    errors,
    isSubmitting,
    submitError,
    bioValue,
    onSubmit,
  } = useOnboardingProfile();

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-8 pb-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View className="mt-8 mb-10">
            <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-primary-hi mb-3">
              PADELCITO
            </Text>
            <Text className="font-grotesk font-extrabold text-[30px] leading-tight tracking-tight text-neutral">
              Set Up Your Profile
            </Text>
            <Text className="font-grotesk text-base text-neutral/60 mt-2 leading-6">
              Tell other players who you are before your first match.
            </Text>
          </View>

          {/* ── Submit error banner ─────────────────────────────────────── */}
          {submitError !== null && <SubmitErrorBanner message={submitError} />}

          {/* ── Username ────────────────────────────────────────────────── */}
          <UsernameField control={control} error={errors.username?.message} />

          {/* ── Bio ─────────────────────────────────────────────────────── */}
          <BioField
            control={control}
            error={errors.bio?.message}
            charCount={bioValue.length}
          />

          {/* ── WhatsApp ─────────────────────────────────────────────────── */}
          <WhatsAppField control={control} error={errors.whatsapp_phone?.message} />

          {/* ── Padel skill level ────────────────────────────────────────── */}
          <SkillLevelChips control={control} errors={errors} />

          {/* ── Playing preferences ──────────────────────────────────────── */}
          <PlayingProfileFields control={control} errors={errors} />

          {/* ── Match fit (optional) ───────────────────────────────────── */}
          <DemographicsFields control={control} errors={errors} />

          {/* ── Submit CTA ──────────────────────────────────────────────── */}
          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting}
            android_ripple={{ color: 'rgba(94,112,184,0.3)' }}
            className={[
              'h-14 rounded-lg items-center justify-center flex-row gap-3',
              isSubmitting ? 'bg-surface-1' : 'bg-primary',
            ].join(' ')}
          >
            {isSubmitting && (
              <ActivityIndicator color="rgba(228,228,228,0.60)" size="small" />
            )}
            <Text
              className={[
                'font-grotesk font-medium text-base tracking-wide',
                isSubmitting ? 'text-neutral/38' : 'text-neutral',
              ].join(' ')}
            >
              {isSubmitting ? 'SAVING...' : 'SAVE PROFILE'}
            </Text>
          </Pressable>
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
  inputRow: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  textInput: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  bioInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 96,
  },
});
