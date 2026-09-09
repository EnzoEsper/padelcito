import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toUserFacingError } from '@/lib/error-message';
import { logger } from '@/lib/logger';

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.rpc('delete_account');
      if (error !== null) {
        throw error;
      }

      await supabase.auth.signOut();
    },
    onError: (error) => {
      logger.error('delete_account failed', error);
    },
  });
}

export function deleteAccountErrorMessage(error: unknown): string {
  return toUserFacingError(error, 'Could not delete your account. Please try again or contact support.');
}
