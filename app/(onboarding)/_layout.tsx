import { Stack } from 'expo-router';

import { OnboardingFormProvider } from '@/lib/onboarding-form-context';

export default function OnboardingLayout() {
  return (
    <OnboardingFormProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0B0B0B' },
        }}
      />
    </OnboardingFormProvider>
  );
}
