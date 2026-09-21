import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pressable, Text, View } from '@/tw';
import { StackScreenLayout } from '@/components/stack-screen-layout';
import { useAppAlert } from '@/components/app-alert-dialog';
import { DemographicsFields } from '@/features/profile/demographics-fields';
import {
  isBirthDateEligible,
  MIN_PROFILE_AGE_YEARS,
} from '@/lib/profile-demographics';
import {
  useProfileDemographics,
  useUpdateProfileDemographics,
} from '@/features/profile/use-profile-demographics';

const personalInfoSchema = z.object({
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
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

export default function EditPersonalInfoScreen() {
  const appAlert = useAppAlert();
  const { data: demographics, isPending } = useProfileDemographics();
  const updateDemographics = useUpdateProfileDemographics();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      gender: 'unspecified',
      birth_date: '',
    },
  });

  useEffect(() => {
    if (demographics === undefined) {
      return;
    }

    reset({
      gender: demographics?.gender ?? 'unspecified',
      birth_date: demographics?.birth_date ?? '',
    });
  }, [demographics, reset]);

  const onSubmit = handleSubmit((data) => {
    void updateDemographics
      .mutateAsync({
        gender: data.gender,
        birth_date: data.birth_date.length > 0 ? data.birth_date : null,
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Could not save personal info.';
        appAlert('Save failed', message);
      });
  });

  return (
    <StackScreenLayout
      eyebrow="PROFILE"
      title="Personal info"
      subtitle="Self-reported details for match compatibility hints."
    >
      {isPending ? (
        <ActivityIndicator color="#E4E4E4" style={styles.loader} />
      ) : (
        <>
          <DemographicsFields control={control} errors={errors} showIntro={false} />
          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting || updateDemographics.isPending}
            className={[
              'h-14 rounded-lg items-center justify-center flex-row gap-3 mt-2',
              isSubmitting || updateDemographics.isPending ? 'bg-surface-1' : 'bg-primary',
            ].join(' ')}
          >
            {isSubmitting || updateDemographics.isPending ? (
              <ActivityIndicator color="rgba(228,228,228,0.60)" size="small" />
            ) : null}
            <Text
              className={[
                'font-grotesk font-medium text-base tracking-wide',
                isSubmitting || updateDemographics.isPending
                  ? 'text-neutral/38'
                  : 'text-neutral',
              ].join(' ')}
            >
              {isSubmitting || updateDemographics.isPending ? 'SAVING...' : 'SAVE'}
            </Text>
          </Pressable>
          {updateDemographics.isSuccess ? (
            <View style={styles.savedBanner}>
              <Text style={styles.savedText}>Personal info saved.</Text>
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
