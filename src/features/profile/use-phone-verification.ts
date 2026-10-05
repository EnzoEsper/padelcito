import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  checkPhoneVerification,
  startPhoneVerification,
  type VerifyPhoneChannel,
} from '@/features/profile/phone-verification-client';

export function useStartPhoneVerification() {
  return useMutation({
    mutationFn: async (input: {
      phone: string;
      resend?: boolean;
    }): Promise<{ channel: VerifyPhoneChannel }> => startPhoneVerification(input),
  });
}

export function useCheckPhoneVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { phone: string; code: string }): Promise<void> =>
      checkPhoneVerification(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'contact-gate'] }),
        queryClient.invalidateQueries({ queryKey: ['public-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['matches'] }),
      ]);
    },
  });
}
