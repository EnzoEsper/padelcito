import { type QueryClient, useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export const PADEL_SPORT_SLUG = 'padel' as const;

type SportRow = Database['public']['Tables']['sports']['Row'];

export class PadelSportNotFoundError extends Error {
  constructor(cause?: unknown) {
    super('Padel sport not found');
    this.name = 'PadelSportNotFoundError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class UnsupportedSportError extends Error {
  constructor() {
    super('This match is not available');
    this.name = 'UnsupportedSportError';
  }
}

export const padelSportKeys = {
  all: ['sports', PADEL_SPORT_SLUG] as const,
};

export async function fetchPadelSport(): Promise<SportRow> {
  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .eq('slug', PADEL_SPORT_SLUG)
    .eq('is_active', true)
    .single();

  if (error !== null || data === null) {
    logger.error('padel sport lookup failed', error);
    throw new PadelSportNotFoundError(error ?? undefined);
  }

  return data;
}

export function ensurePadelSport(queryClient: QueryClient): Promise<SportRow> {
  return queryClient.ensureQueryData({
    queryKey: padelSportKeys.all,
    queryFn: fetchPadelSport,
    staleTime: Infinity,
  });
}

export function usePadelSport() {
  return useQuery({
    queryKey: padelSportKeys.all,
    queryFn: fetchPadelSport,
    staleTime: Infinity,
  });
}
