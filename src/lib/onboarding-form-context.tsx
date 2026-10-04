import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type OnboardingStep1Feedback = {
  message: string;
  fieldMessage?: string;
};

type OnboardingFormContextValue = {
  username: string;
  setUsername: (username: string) => void;
  step1Feedback: OnboardingStep1Feedback | null;
  setStep1Feedback: (feedback: OnboardingStep1Feedback | null) => void;
};

const OnboardingFormContext = createContext<OnboardingFormContextValue | null>(null);

export function OnboardingFormProvider({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState('');
  const [step1Feedback, setStep1FeedbackState] = useState<OnboardingStep1Feedback | null>(null);

  const setUsername = useCallback((value: string) => {
    setUsernameState(value);
  }, []);

  const setStep1Feedback = useCallback((feedback: OnboardingStep1Feedback | null) => {
    setStep1FeedbackState(feedback);
  }, []);

  const value = useMemo(
    () => ({
      username,
      setUsername,
      step1Feedback,
      setStep1Feedback,
    }),
    [username, setUsername, step1Feedback, setStep1Feedback],
  );

  return (
    <OnboardingFormContext.Provider value={value}>{children}</OnboardingFormContext.Provider>
  );
}

export function useOnboardingForm(): OnboardingFormContextValue {
  const context = useContext(OnboardingFormContext);
  if (context === null) {
    throw new Error('useOnboardingForm must be used within OnboardingFormProvider');
  }
  return context;
}
