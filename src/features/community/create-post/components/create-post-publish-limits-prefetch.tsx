import { useCommunityPublishLimits } from '@/features/community/use-posts';

/** Warms publish-limit query for all create-post steps. */
export function CreatePostPublishLimitsPrefetch() {
  useCommunityPublishLimits();
  return null;
}
