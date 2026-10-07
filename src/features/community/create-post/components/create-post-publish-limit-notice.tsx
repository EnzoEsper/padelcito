import { useRouter } from 'expo-router';
import { Pressable, Text, View } from '@/tw';
import {
  useCommunityPublishLimits,
  type CommunityPublishLimits,
} from '@/features/community/use-posts';
import { buildMyPostsRoute } from '@/features/community/post-display';

function limitMessage(limits: CommunityPublishLimits): string {
  if (limits.pendingReviewBlocked) {
    return 'You already have two posts waiting for moderation. Wait until one is approved or rejected before submitting another.';
  }
  return 'You can submit at most five community posts every 24 hours. Try again later.';
}

function limitTitle(limits: CommunityPublishLimits): string {
  if (limits.pendingReviewBlocked) {
    return 'Moderation queue full';
  }
  return 'Daily limit reached';
}

type CreatePostPublishLimitNoticeProps = {
  /** When true, show even while limits query is still loading (empty placeholder avoided). */
  compact?: boolean;
};

export function CreatePostPublishLimitNotice({ compact = false }: CreatePostPublishLimitNoticeProps) {
  const router = useRouter();
  const { data, isLoading, isError } = useCommunityPublishLimits();

  if (isLoading || isError || data === undefined || data.canPublish) {
    return null;
  }

  return (
    <View
      className={`rounded-2xl border border-primary/30 bg-primary/10 ${compact ? 'p-3 gap-2' : 'p-4 gap-3'}`}
    >
      <Text className="font-grotesk text-base font-semibold text-neutral">
        {limitTitle(data)}
      </Text>
      <Text className="font-grotesk text-sm text-neutral/70 leading-5">{limitMessage(data)}</Text>
      {data.pendingReviewBlocked ? (
        <Pressable
          onPress={() => router.push(buildMyPostsRoute())}
          className="self-start px-3 py-2 rounded-xl bg-surface-1 border border-neutral/15"
        >
          <Text className="font-grotesk text-sm font-semibold text-neutral">View my posts</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function useCreatePostPublishBlocked(): boolean {
  const { data } = useCommunityPublishLimits();
  return data?.canPublish === false;
}
