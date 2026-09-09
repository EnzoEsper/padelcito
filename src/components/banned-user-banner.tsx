import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/tw';
import { LEGAL_URLS } from '@/lib/legal-urls';
import { useIsSuspended } from '@/lib/app-layout-insets';

const C = {
  surface: '#141417',
  warning: '#E0B15B',
  warningBorder: 'rgba(224,176,91,0.28)',
  body: 'rgba(228,228,228,0.72)',
} as const;

export function BannedUserBanner() {
  const insets = useSafeAreaInsets();
  const isSuspended = useIsSuspended();

  if (!isSuspended) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.banner, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Account suspended</Text>
        <Text style={styles.body}>
          You cannot create matches or community posts. Contact {LEGAL_URLS.supportEmail} if you
          believe this is an error.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  banner: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.warningBorder,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    color: C.warning,
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
  },
  body: {
    color: C.body,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
  },
});
