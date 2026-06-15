import { useEffect, useState } from 'react';
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

/** Keeps the Realtime socket JWT in sync with the current Supabase session. */
export async function applyRealtimeAuth(accessToken: string | null): Promise<void> {
  await supabase.realtime.setAuth(accessToken);
}

/** Returns the current access token; updates on sign-in, refresh, and sign-out. */
export function useAccessToken(): string | null {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });

    const subscription = subscribeToAuthChanges((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return accessToken;
}
