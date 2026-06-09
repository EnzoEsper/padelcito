import { supabase } from './supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export type AuthStateHandler = (
  event: AuthChangeEvent,
  session: Session | null
) => void;

export function subscribeToAuthChanges(handler: AuthStateHandler) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(handler);
  return subscription;
}
