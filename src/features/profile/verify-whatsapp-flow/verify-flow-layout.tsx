import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_PADDING } from '@/components/stack-screen-layout';

type VerifyFlowLayoutProps = {
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

/** Full-screen verify intro: header, flex body, pinned footer (no overlap). */
export function VerifyFlowLayout({
  headerLeft,
  headerRight,
  children,
  footer,
}: VerifyFlowLayoutProps) {
  const insets = useSafeAreaInsets();
  const top = insets.top + 8;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: top, paddingHorizontal: SCREEN_PADDING }]}>
        <View style={styles.headerSide}>{headerLeft ?? null}</View>
        <View style={styles.headerSpacer} />
        <View style={styles.headerSide}>{headerRight ?? null}</View>
      </View>

      <View style={[styles.body, { paddingHorizontal: SCREEN_PADDING }]}>{children}</View>

      <View
        style={[
          styles.footer,
          { paddingHorizontal: SCREEN_PADDING, paddingBottom: insets.bottom + 12 },
        ]}
      >
        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  headerSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(228,228,228,0.08)',
    backgroundColor: '#0B0B0B',
  },
});
