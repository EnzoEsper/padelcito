import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from '@/tw';
import {
  CreatePostFormBody,
  CreatePostPublishFooter,
} from '@/features/community/create-post/create-post-form';
import { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';

const SCREEN_PADDING = 20;
const BACK_BUTTON_SIZE = 44;
const BACK_TEXT_INSET = BACK_BUTTON_SIZE + 12;

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fresh } = useLocalSearchParams<{ fresh?: string | string[] }>();
  const freshKey = Array.isArray(fresh) ? fresh[0] : fresh;
  const form = useCreatePostForm();

  useEffect(() => {
    form.reset();
  }, [freshKey, form]);

  const scrollBottomInset = 112 + insets.bottom;
  const headerTop = insets.top + 16;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: headerTop, left: SCREEN_PADDING }]}
        className="rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color="#E4E4E4" />
      </Pressable>

      <ScrollView
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
      >
        <View style={styles.header}>
          <View style={styles.headerMetaRow}>
            <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
              COMMUNITY
            </Text>
          </View>
          <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={styles.headerTitle}>
            Publish post
          </Text>
          <Text className="font-grotesk text-sm text-neutral/60 mt-2 leading-5">
            Share a tournament or training session. Contact uses your profile WhatsApp and every post is reviewed before going public.
          </Text>
        </View>

        <CreatePostFormBody form={form} />
      </ScrollView>

      <LinearGradient
        colors={['rgba(11,11,11,0)', '#0B0B0B']}
        style={styles.footerFade}
        pointerEvents="none"
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <CreatePostPublishFooter form={form} />
      </View>
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
    paddingHorizontal: SCREEN_PADDING,
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
  },
  header: {
    marginBottom: 28,
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
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    backgroundColor: 'rgba(11,11,11,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(228,228,228,0.055)',
  },
});
