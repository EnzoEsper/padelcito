import { useEffect, useMemo } from 'react';
import { View as RNView } from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from '@/tw';
import { useCreatePostDiscardGuard } from '@/features/community/create-post/use-create-post-discard-guard';
import { CreatePostScreenShell } from '@/features/community/create-post/components/create-post-screen-shell';
import { CreatePostStepHeader } from '@/features/community/create-post/components/create-post-step-header';
import { useCreatePostFormContext } from '@/features/community/create-post/create-post-form-context';
import { buildPreviewPostSummary } from '@/features/community/create-post/build-post-preview';
import { PostSummaryCard } from '@/features/community/components/post-summary-card';
import { PostDetailContent } from '@/features/community/components/post-detail-content';
import { CreatePostPublishButton } from '@/features/community/create-post/create-post-publish';
import { CreatePostPublishLimitNotice } from '@/features/community/create-post/components/create-post-publish-limit-notice';
function formIsDirty(form: ReturnType<typeof useCreatePostFormContext>): boolean {
  return form.subtype !== null || form.title.trim().length > 0;
}

export default function CreatePostReviewScreen() {
  const router = useRouter();
  const form = useCreatePostFormContext();
  useCreatePostDiscardGuard(formIsDirty(form));

  const previewPost = useMemo(() => buildPreviewPostSummary(form, null), [form]);

  useEffect(() => {
    if (form.subtype === null) {
      router.replace('/(app)/create-post');
    }
  }, [form.subtype, router]);

  if (form.subtype === null) {
    return null;
  }

  return (
    <CreatePostScreenShell
      footer={
        <View className="gap-3">
          <CreatePostPublishLimitNotice compact />
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-14 flex-1 rounded-2xl border border-neutral/15 bg-surface-1 items-center justify-center"
            >
              <Text className="font-grotesk text-base font-semibold text-neutral/70">Edit</Text>
            </Pressable>
            <CreatePostPublishButton form={form} />
          </View>
        </View>
      }
    >
      <CreatePostStepHeader
        stepLabel="Community · Step 3 of 3"
        title="Review"
        subtitle="This is how players will see your post in the feed and on the detail page."
      />

      <View className="gap-3 mb-6">
        <Text className="font-mono text-[10px] uppercase tracking-widest text-neutral/45">
          Feed preview
        </Text>
        <PostSummaryCard post={previewPost} localFlyerUri={form.imageUri} />
      </View>

      <View className="gap-3">
        <Text className="font-mono text-[10px] uppercase tracking-widest text-neutral/45">
          Detail preview
        </Text>
        <RNView className="-mx-5">
          <PostDetailContent post={previewPost} localFlyerUri={form.imageUri} headerPaddingHorizontal={20} />
        </RNView>
      </View>
    </CreatePostScreenShell>
  );
}
