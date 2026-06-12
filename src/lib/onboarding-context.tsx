import { createContext, useContext } from 'react';

// Exposed by the root layout so child routes (specifically the onboarding
// screen) can synchronously mark the profile as complete before navigating
// away, preventing the redirect guard from bouncing the user back.

type OnboardingContextValue = {
  markProfileComplete: () => void;
};

export const OnboardingContext = createContext<OnboardingContextValue>({
  markProfileComplete: () => undefined,
});

export function useOnboardingContext(): OnboardingContextValue {
  return useContext(OnboardingContext);
}
