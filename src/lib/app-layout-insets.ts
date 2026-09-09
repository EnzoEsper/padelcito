import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/features/profile/use-profile';

/** Banner content below the safe area: padding + title + body + bottom padding. */
export const SUSPENSION_BANNER_BODY_HEIGHT = 80;

export function useIsSuspended(): boolean {
  const { data: profile } = useProfile();
  return profile?.banned_at != null;
}

/** Top padding for screen headers when the suspension banner may overlay content. */
export function useAppContentTopPadding(extra = 16): number {
  const insets = useSafeAreaInsets();
  const isSuspended = useIsSuspended();

  if (isSuspended) {
    return insets.top + SUSPENSION_BANNER_BODY_HEIGHT + extra;
  }

  return insets.top + extra;
}
