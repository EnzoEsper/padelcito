import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { View, Text, Pressable } from '@/tw';
import { OnboardingStepIndicator } from '@/features/onboarding/onboarding-step-indicator';
import { PadelCategoryField } from '@/features/profile/padel-category-field';
import { useOnboardingSkillStep } from '@/features/onboarding/use-onboarding-profile';

function SubmitErrorBanner({ message }: { message: string }) {
  return (
    <View className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 mb-4">
      <Text className="font-grotesk text-sm text-warning leading-5">{message}</Text>
    </View>
  );
}

export default function OnboardingSkillScreen() {
  const { control, errors, isSubmitting, submitError, onSubmit } = useOnboardingSkillStep();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <OnboardingStepIndicator currentStep={2} />

        <View className="mb-6">
          <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-primary-hi mb-2">
            ALMOST THERE
          </Text>
          <Text className="font-grotesk font-extrabold text-[28px] leading-tight tracking-tight text-neutral">
            What&apos;s your padel category?
          </Text>
          <Text className="font-grotesk text-[14px] text-neutral/50 mt-1.5 leading-[21px]">
            1st is the strongest. Not sure? Pick a higher number — better to surprise than disappoint.
          </Text>
        </View>

        {submitError !== null ? <SubmitErrorBanner message={submitError} /> : null}

        <PadelCategoryField
          control={control}
          errors={errors}
          sectionLabel=""
          containerClassName="mb-6"
          emphasizeDescription
        />

        <View style={styles.footer}>
          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting}
            android_ripple={{ color: 'rgba(94,112,184,0.3)' }}
            className={[
              'h-[52px] rounded-xl items-center justify-center flex-row gap-3',
              isSubmitting ? 'bg-surface-1' : 'bg-primary',
            ].join(' ')}
          >
            {isSubmitting ? (
              <ActivityIndicator color="rgba(228,228,228,0.60)" size="small" />
            ) : null}
            <Text
              className={[
                'font-grotesk font-medium text-[15px] tracking-wide',
                isSubmitting ? 'text-neutral/38' : 'text-neutral',
              ].join(' ')}
            >
              {isSubmitting ? 'SAVING...' : 'SAVE & START'}
            </Text>
          </Pressable>

          <Text className="font-grotesk text-xs text-neutral/40 text-center mt-3">
            You can always change this later.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 24,
  },
  footer: {
    marginTop: 'auto',
  },
});
