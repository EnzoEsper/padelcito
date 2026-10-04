import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, useController, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pressable, Text, TextInput, View } from '@/tw';
import { StackScreenLayout } from '@/components/stack-screen-layout';
import { useAppAlert } from '@/components/app-alert-dialog';
import { DemographicsFields } from '@/features/profile/demographics-fields';
import { PlayingProfileFields } from '@/features/profile/playing-profile-fields';
import { PadelCategoryField } from '@/features/profile/padel-category-field';
import { clampPadelCategory, padelCategoryFieldSchema } from '@/lib/padel-category';
import {
  useProfile,
  useProfileSport,
  useUpdateProfileBio,
  useUpdateProfileWhatsApp,
} from '@/features/profile/use-profile';
import {
  ARGENTINA_CALLING_CODE,
  formatArgentinaWhatsAppLocalInput,
  parseArgentinaWhatsAppLocalToNullableE164,
} from '@/lib/argentina-whatsapp-phone';
import {
  useProfileDemographics,
  useUpdateProfileDemographics,
} from '@/features/profile/use-profile-demographics';
import {
  usePlayingProfile,
  useUpdatePlayingProfile,
} from '@/features/profile/use-playing-profile';
import { isBirthDateEligible, MIN_PROFILE_AGE_YEARS } from '@/lib/profile-demographics';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';
const BORDER_DEFAULT = 'rgba(228,228,228,0.10)';
const BORDER_FOCUSED = 'rgba(228,228,228,0.60)';
const BORDER_ERROR = 'rgba(224,177,91,0.60)';

const editProfileSchema = z.object({
  padel_category: padelCategoryFieldSchema,
  dominant_hand: z.enum(['unspecified', 'right', 'left', 'ambidextrous']),
  court_side_preference: z.enum(['any', 'drive', 'backhand']),
  years_playing: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z.string().refine(
        (val) => val === '' || (/^\d+$/.test(val) && Number(val) <= 80),
        { message: 'Enter a number up to 80' },
      ),
    ),
  gender: z.enum(['unspecified', 'male', 'female', 'hidden']),
  birth_date: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z.string().refine(
        (val) => val === '' || isBirthDateEligible(val),
        { message: `You must be at least ${MIN_PROFILE_AGE_YEARS} years old` },
      ),
    ),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters'),
  whatsapp_phone_local: z.string().superRefine((val, ctx) => {
    try {
      parseArgentinaWhatsAppLocalToNullableE164(val);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Enter a valid Argentine mobile number, e.g. 11 2345-6789';
      ctx.addIssue({ code: 'custom', message });
    }
  }),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

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

type BioFieldProps = {
  control: Control<EditProfileFormData>;
  error: string | undefined;
  charCount: number;
};

type WhatsAppFieldProps = {
  control: Control<EditProfileFormData>;
  error: string | undefined;
};

function WhatsAppField({ control, error }: WhatsAppFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { field } = useController({
    control,
    name: 'whatsapp_phone_local',
    defaultValue: '',
  });

  const borderColor = error ? BORDER_ERROR : isFocused ? BORDER_FOCUSED : BORDER_DEFAULT;

  return (
    <View className="mb-6">
      <SectionLabel>WhatsApp — Optional</SectionLabel>
      <Text className="font-grotesk text-sm text-neutral/50 mb-3 leading-5">
        Used for match contact and community posts. Argentine mobile numbers only.
      </Text>
      <View style={[styles.phoneRow, { borderColor }]}>
        <Text style={styles.phonePrefix}>{ARGENTINA_CALLING_CODE}</Text>
        <TextInput
          value={field.value}
          onChangeText={(text) => field.onChange(text.replace(/[^\d\s-]/g, ''))}
          onBlur={() => {
            field.onBlur();
            setIsFocused(false);
          }}
          onFocus={() => setIsFocused(true)}
          keyboardType="phone-pad"
          placeholder="9 11 2345-6789"
          placeholderTextColor={PLACEHOLDER_COLOR}
          style={styles.phoneInput}
          className="flex-1 font-grotesk text-base text-neutral"
          accessibilityLabel="WhatsApp mobile number"
        />
      </View>
      <FieldError message={error} />
    </View>
  );
}

function BioField({ control, error, charCount }: BioFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { field } = useController({ control, name: 'bio', defaultValue: '' });

  const borderColor = error ? BORDER_ERROR : isFocused ? BORDER_FOCUSED : BORDER_DEFAULT;

  return (
    <View className="mb-6">
      <SectionLabel>Bio — Optional</SectionLabel>
      <TextInput
        value={field.value}
        onChangeText={(text) => field.onChange(text)}
        onBlur={() => {
          field.onBlur();
          setIsFocused(false);
        }}
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

export default function EditProfileScreen() {
  const appAlert = useAppAlert();
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const { data: profile, isPending: profilePending } = useProfile();
  const { data: sport, isPending: sportPending } = useProfileSport();
  const { data: playingProfile, isPending: playingPending } = usePlayingProfile();
  const { data: demographics, isPending: demographicsPending } = useProfileDemographics();

  const updatePlayingProfile = useUpdatePlayingProfile();
  const updateDemographics = useUpdateProfileDemographics();
  const updateBio = useUpdateProfileBio();
  const updateWhatsApp = useUpdateProfileWhatsApp();

  const isLoading =
    profilePending || sportPending || playingPending || demographicsPending;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      padel_category: 5,
      dominant_hand: 'unspecified',
      court_side_preference: 'any',
      years_playing: '',
      gender: 'unspecified',
      birth_date: '',
      bio: '',
      whatsapp_phone_local: '',
    },
  });

  const bioValue = watch('bio');

  useEffect(() => {
    if (isLoading) {
      return;
    }

    reset({
      padel_category: clampPadelCategory(
        playingProfile?.padel_category ?? sport?.padel_category ?? 5,
      ),
      dominant_hand: playingProfile?.dominant_hand ?? 'unspecified',
      court_side_preference: playingProfile?.court_side_preference ?? 'any',
      years_playing:
        playingProfile?.years_playing !== null &&
        playingProfile?.years_playing !== undefined
          ? String(playingProfile.years_playing)
          : '',
      gender: demographics?.gender ?? profile?.gender ?? 'unspecified',
      birth_date: demographics?.birth_date ?? profile?.birth_date ?? '',
      bio: profile?.bio ?? '',
      whatsapp_phone_local: formatArgentinaWhatsAppLocalInput(profile?.whatsapp_phone),
    });
  }, [
    demographics,
    isLoading,
    playingProfile,
    profile,
    reset,
    sport,
  ]);

  const onSubmit = handleSubmit((data) => {
    setShowSavedBanner(false);
    const parsedYears =
      data.years_playing.length > 0 ? Number.parseInt(data.years_playing, 10) : null;
    const yearsPlaying =
      parsedYears !== null && !Number.isNaN(parsedYears) ? parsedYears : null;

    const whatsappPhone = parseArgentinaWhatsAppLocalToNullableE164(
      data.whatsapp_phone_local,
    );

    void Promise.all([
      updatePlayingProfile.mutateAsync({
        padel_category: data.padel_category,
        dominant_hand: data.dominant_hand,
        court_side_preference: data.court_side_preference,
        years_playing: yearsPlaying,
      }),
      updateDemographics.mutateAsync({
        gender: data.gender,
        birth_date: data.birth_date.length > 0 ? data.birth_date : null,
      }),
      updateBio.mutateAsync({ bio: data.bio }),
      updateWhatsApp.mutateAsync({ whatsapp_phone: whatsappPhone }),
    ])
      .then(() => {
        setShowSavedBanner(true);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Could not save profile.';
        appAlert('Save failed', message);
      });
  });

  const isSaving =
    isSubmitting ||
    updatePlayingProfile.isPending ||
    updateDemographics.isPending ||
    updateBio.isPending ||
    updateWhatsApp.isPending;

  return (
    <StackScreenLayout
      eyebrow="PROFILE"
      title="Edit profile"
      subtitle="Update how you show up to other players."
    >
      {isLoading ? (
        <ActivityIndicator color="#E4E4E4" style={styles.loader} />
      ) : (
        <>
          <PadelCategoryField control={control} errors={errors} sectionLabel="Padel category" />
          <PlayingProfileFields control={control} errors={errors} />
          <DemographicsFields control={control} errors={errors} showIntro={false} />
          <WhatsAppField
            control={control}
            error={errors.whatsapp_phone_local?.message}
          />
          <BioField control={control} error={errors.bio?.message} charCount={bioValue.length} />

          <Pressable
            onPress={onSubmit}
            disabled={isSaving}
            className={[
              'h-14 rounded-lg items-center justify-center flex-row gap-3 mt-2',
              isSaving ? 'bg-surface-1' : 'bg-primary',
            ].join(' ')}
          >
            {isSaving ? (
              <ActivityIndicator color="rgba(228,228,228,0.60)" size="small" />
            ) : null}
            <Text
              className={[
                'font-grotesk font-medium text-base tracking-wide',
                isSaving ? 'text-neutral/38' : 'text-neutral',
              ].join(' ')}
            >
              {isSaving ? 'SAVING...' : 'SAVE'}
            </Text>
          </Pressable>

          {showSavedBanner ? (
            <View style={styles.savedBanner}>
              <Text style={styles.savedText}>Profile saved.</Text>
            </View>
          ) : null}
        </>
      )}
    </StackScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 32,
  },
  bioInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 96,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 52,
    backgroundColor: '#232429',
  },
  phonePrefix: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    color: 'rgba(228,228,228,0.60)',
    marginRight: 8,
  },
  phoneInput: {
    paddingVertical: 14,
  },
  savedBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(123,200,158,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(123,200,158,0.25)',
  },
  savedText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    color: '#7BC89E',
    textAlign: 'center',
  },
});
