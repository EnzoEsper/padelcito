import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import { PostSummaryCard } from '@/features/community/components/post-summary-card';
import {
  buildCreatePostRoute,
  buildPostDetailRoute,
} from '@/features/community/post-display';
import { useMyPosts } from '@/features/community/use-posts';
import { useMyPostsRealtime } from '@/features/community/use-post-realtime';
import { useProfile } from '@/features/profile/use-profile';

const C = {
  background: '#0B0B0B',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

export default function MyPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const postsQuery = useMyPosts();
  useMyPostsRealtime(profile?.id ?? null);
  const posts = postsQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={postsQuery.isRefetching}
            onRefresh={() => void postsQuery.refetch()}
            tintColor={C.mist}
          />
        }
      >
        <View style={{ paddingTop: insets.top + 12 }} className="px-5 pb-5">
          <Pressable
            onPress={() => router.back()}
            className="mb-4 h-10 w-10 rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color={C.mist} />
          </Pressable>

          <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
            COMMUNITY
          </Text>
          <Text
            className="font-grotesk font-extrabold text-[30px] text-neutral"
            style={{ letterSpacing: -0.8 }}
          >
            My publications
          </Text>
          <Text className="font-grotesk text-sm text-neutral/55 mt-2">
            Track pending, published, and rejected posts you have submitted.
          </Text>
        </View>

        {postsQuery.isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={C.mist} />
          </View>
        ) : postsQuery.isError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {postsQuery.error instanceof Error
                ? postsQuery.error.message
                : 'Could not load your publications.'}
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={28} color={C.faint} />
            <Text style={styles.emptyTitle}>No publications yet</Text>
            <Text style={styles.emptyText}>
              Publish a tournament or training post to reach players in your area.
            </Text>
            <Pressable
              onPress={() => router.push(buildCreatePostRoute())}
              style={styles.emptyAction}
            >
              <Text style={styles.emptyActionText}>Publish post</Text>
            </Pressable>
          </View>
        ) : (
          posts.map((post) => (
            <PostSummaryCard
              key={post.id}
              post={post}
              showStatus
              onPress={() => router.push(buildPostDetailRoute(post.id))}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  errorCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: '#141417',
  },
  errorText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: C.faint,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 8,
    backgroundColor: '#2B396D',
    borderWidth: 1,
    borderColor: '#5E70B8',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    fontWeight: '700',
  },
});
