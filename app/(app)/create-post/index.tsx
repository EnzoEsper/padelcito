import { useEffect } from 'react';
import { Text, Pressable, View } from '@/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CreatePostScreenShell } from '@/features/community/create-post/components/create-post-screen-shell';
import { CreatePostStepHeader } from '@/features/community/create-post/components/create-post-step-header';
import { useCreatePostFormContext } from '@/features/community/create-post/create-post-form-context';
import {
  PostTypeFormatStep,
  canContinueTypeStep,
} from '@/features/community/create-post/post-type-format-step';
import {
  CreatePostPublishLimitNotice,
  useCreatePostPublishBlocked,
} from '@/features/community/create-post/components/create-post-publish-limit-notice';
export default function CreatePostTypeScreen() {
  const router = useRouter();
  const { fresh } = useLocalSearchParams<{ fresh?: string | string[] }>();
  const freshKey = Array.isArray(fresh) ? fresh[0] : fresh;
  const form = useCreatePostFormContext();
  const resetForm = form.reset;

  useEffect(() => {
    resetForm();
  }, [freshKey, resetForm]);

  const canContinue = canContinueTypeStep(form);
  const publishBlocked = useCreatePostPublishBlocked();

  return (
    <CreatePostScreenShell
      footer={
        publishBlocked ? null : (
          <Pressable
            onPress={() => {
              if (!canContinue) return;
              router.push('/(app)/create-post/details');
            }}
            disabled={!canContinue}
            className="h-14 rounded-2xl bg-primary border border-primary-hi items-center justify-center"
            style={{ opacity: canContinue ? 1 : 0.45 }}
          >
            <Text className="font-grotesk text-base font-bold text-neutral">Continue</Text>
          </Pressable>
        )
      }
    >
      <CreatePostStepHeader
        stepLabel="Community · Step 1 of 3"
        title="What are you publishing?"
        subtitle="Pick the event type and format. You can add the flyer and details next."
      />
      <View className="mb-4">
        <CreatePostPublishLimitNotice />
      </View>
      <PostTypeFormatStep key={freshKey ?? 'create-post-type'} form={form} />
    </CreatePostScreenShell>
  );
}
