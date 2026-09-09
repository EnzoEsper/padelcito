import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text } from '@/tw';

export const SCREEN_PADDING = 20;
export const BACK_BUTTON_SIZE = 44;
export const BACK_TEXT_INSET = BACK_BUTTON_SIZE + 12;

const C = {
  background: '#0B0B0B',
  mist: '#E4E4E4',
} as const;

type StackScreenLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function StackScreenLayout({
  eyebrow,
  title,
  subtitle,
  children,
}: StackScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const headerTop = insets.top + 16;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: headerTop, left: SCREEN_PADDING }]}
        className="rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={C.mist} />
      </Pressable>

      <ScrollView
        className="flex-1 bg-background"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerTop,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerMetaRow}>
            <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
              {eyebrow}
            </Text>
          </View>
          <Text
            className="font-grotesk font-extrabold text-[30px] text-neutral"
            style={styles.headerTitle}
          >
            {title}
          </Text>
          {subtitle !== undefined && subtitle.length > 0 ? (
            <Text className="font-grotesk text-sm text-neutral/60 mt-2 leading-5">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
  },
  header: {
    marginBottom: 24,
  },
  headerMetaRow: {
    height: BACK_BUTTON_SIZE,
    justifyContent: 'center',
    paddingLeft: BACK_TEXT_INSET,
    marginBottom: 4,
  },
  headerTitle: {
    letterSpacing: -0.8,
  },
});
