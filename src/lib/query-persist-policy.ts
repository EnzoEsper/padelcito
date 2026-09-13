export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = typeof queryKey[0] === 'string' ? queryKey[0] : '';
  if (root === 'matches' && queryKey.includes('contacts')) return false;
  if (root === 'profiles') return false;
  // Sport catalog IDs can change after local db reset / migrations — never persist.
  if (root === 'sports') return false;
  // Moderator-only roster — permission-sensitive; never persist (avoids hydration rejections).
  if (root === 'banned-users') return false;
  return true;
}
