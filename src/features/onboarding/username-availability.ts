import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const USERNAME_TAKEN_MESSAGE = 'This handle is already taken. Try another one.';

export type UsernameAvailabilityResult =
  | { status: 'available' }
  | { status: 'taken'; message: string }
  | { status: 'error'; message: string };

/**
 * Checks handle uniqueness via public_profiles (profiles RLS only exposes the caller's row).
 */
export async function checkUsernameAvailability(
  username: string,
  currentUserId: string,
): Promise<UsernameAvailabilityResult> {
  const trimmed = username.trim();

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('username', trimmed)
    .maybeSingle();

  if (error !== null) {
    logger.error('checkUsernameAvailability failed', error);
    return { status: 'error', message: 'Could not verify handle. Please try again.' };
  }

  if (data?.id === null || data?.id === undefined) {
    return { status: 'available' };
  }

  if (data.id === currentUserId) {
    return { status: 'available' };
  }

  return { status: 'taken', message: USERNAME_TAKEN_MESSAGE };
}
