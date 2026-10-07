import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from '@/tw';
import {
  CREATE_POST_BACK_BUTTON_SIZE,
  CREATE_POST_SCREEN_PADDING,
} from '@/features/community/create-post/create-post-layout';

type CreatePostScreenShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
  onScrollContentLayout?: (event: LayoutChangeEvent) => void;
};

export function CreatePostScreenShell({
  children,
  footer,
  scrollRef,
  onScrollContentLayout,
}: CreatePostScreenShellProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const headerTop = insets.top + 16;
  const scrollBottomInset = footer !== undefined ? 112 + insets.bottom : insets.bottom + 24;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: headerTop, left: CREATE_POST_SCREEN_PADDING }]}
        className="rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color="#E4E4E4" />
      </Pressable>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerTop,
            paddingBottom: scrollBottomInset,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onLayout={onScrollContentLayout}
      >
        <View style={{ paddingHorizontal: CREATE_POST_SCREEN_PADDING }}>{children}</View>
      </ScrollView>

      {footer !== undefined ? (
        <>
          <LinearGradient
            colors={['rgba(11,11,11,0)', '#0B0B0B']}
            style={styles.footerFade}
            pointerEvents="none"
          />
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {footer}
          </View>
        </>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
    width: CREATE_POST_BACK_BUTTON_SIZE,
    height: CREATE_POST_BACK_BUTTON_SIZE,
  },
  footerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: CREATE_POST_SCREEN_PADDING,
    paddingTop: 12,
    backgroundColor: 'rgba(11,11,11,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(228,228,228,0.055)',
  },
});
