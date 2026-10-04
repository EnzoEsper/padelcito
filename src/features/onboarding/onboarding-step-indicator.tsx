import { StyleSheet } from 'react-native';
import { View } from '@/tw';

type OnboardingStepIndicatorProps = {
  currentStep: 1 | 2;
};

export function OnboardingStepIndicator({ currentStep }: OnboardingStepIndicatorProps) {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      <View
        style={[styles.dot, currentStep === 1 ? styles.dotActive : styles.dotInactive]}
        accessibilityLabel="Step 1 of 2"
      />
      <View
        style={[styles.dot, currentStep === 2 ? styles.dotActive : styles.dotInactive]}
        accessibilityLabel="Step 2 of 2"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#5E70B8',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(228,228,228,0.20)',
  },
});
