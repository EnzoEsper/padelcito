import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/features/profile/use-profile';

/** Top padding for tab screens. When the suspension banner is visible it already consumes the safe area. */
export function useAppContentTopPadding(extra = 16): number {
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const isSuspended = profile?.banned_at != null;

  if (isSuspended) {
    return extra;
  }

  return insets.top + extra;
}
