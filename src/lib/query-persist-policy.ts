import { queryClient, persistOptions } from '@/lib/query-client';

void queryClient;
void persistOptions;

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = typeof queryKey[0] === 'string' ? queryKey[0] : '';
  if (root === 'matches' && queryKey.includes('contacts')) return false;
  if (root === 'profiles') return false;
  return true;
}
