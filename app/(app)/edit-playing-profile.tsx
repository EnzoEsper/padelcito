import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pressable, Text, View } from '@/tw';
import { StackScreenLayout } from '@/components/stack-screen-layout';
import { useAppAlert } from '@/components/app-alert-dialog';
import { PlayingProfileFields } from '@/features/profile/playing-profile-fields';
import {
  usePlayingProfile,
  useUpdatePlayingProfile,
} from '@/features/profile/use-playing-profile';

const playingProfileSchema = z.object({
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
});

type PlayingProfileFormData = z.infer<typeof playingProfileSchema>;

export default function EditPlayingProfileScreen() {
  const appAlert = useAppAlert();
  const { data: playingProfile, isPending } = usePlayingProfile();
  const updatePlayingProfile = useUpdatePlayingProfile();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlayingProfileFormData>({
    resolver: zodResolver(playingProfileSchema),
    defaultValues: {
      dominant_hand: 'unspecified',
      court_side_preference: 'any',
      years_playing: '',
    },
  });

  useEffect(() => {
    if (playingProfile === undefined) {
      return;
    }

    reset({
      dominant_hand: playingProfile?.dominant_hand ?? 'unspecified',
      court_side_preference: playingProfile?.court_side_preference ?? 'any',
      years_playing:
        playingProfile?.years_playing !== null &&
        playingProfile?.years_playing !== undefined
          ? String(playingProfile.years_playing)
          : '',
    });
  }, [playingProfile, reset]);

  const onSubmit = handleSubmit((data) => {
    const parsedYears =
      data.years_playing.length > 0 ? Number.parseInt(data.years_playing, 10) : null;
    const yearsPlaying =
      parsedYears !== null && !Number.isNaN(parsedYears) ? parsedYears : null;

    void updatePlayingProfile
      .mutateAsync({
        dominant_hand: data.dominant_hand,
        court_side_preference: data.court_side_preference,
        years_playing: yearsPlaying,
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Could not save playing profile.';
        appAlert('Save failed', message);
      });
  });

  return (
    <StackScreenLayout
      eyebrow="PROFILE"
      title="Playing profile"
      subtitle="Help other players understand how you play padel."
    >
      {isPending ? (
        <ActivityIndicator color="#E4E4E4" style={styles.loader} />
      ) : (
        <>
          <PlayingProfileFields control={control} errors={errors} />
          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting || updatePlayingProfile.isPending}
            className={[
              'h-14 rounded-lg items-center justify-center flex-row gap-3 mt-2',
              isSubmitting || updatePlayingProfile.isPending ? 'bg-surface-1' : 'bg-primary',
            ].join(' ')}
          >
            {isSubmitting || updatePlayingProfile.isPending ? (
              <ActivityIndicator color="rgba(228,228,228,0.60)" size="small" />
            ) : null}
            <Text
              className={[
                'font-grotesk font-medium text-base tracking-wide',
                isSubmitting || updatePlayingProfile.isPending
                  ? 'text-neutral/38'
                  : 'text-neutral',
              ].join(' ')}
            >
              {isSubmitting || updatePlayingProfile.isPending ? 'SAVING...' : 'SAVE'}
            </Text>
          </Pressable>
          {updatePlayingProfile.isSuccess ? (
            <View style={styles.savedBanner}>
              <Text style={styles.savedText}>Playing profile saved.</Text>
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
