import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View, Text, Pressable } from '@/tw';
import { NotificationBell } from '@/components/notification-bell';
import { SegmentedControl } from '@/features/matches/create-match/components/segmented-control';
import { PostSummaryCard } from '@/features/community/components/post-summary-card';
import {
  buildCreatePostRoute,
  buildPostDetailRoute,
  buildModerationRoute,
  POST_DISCOVERY_RADIUS_M,
} from '@/features/community/post-display';
import {
  useAllPosts,
  useNearbyPosts,
  useModerationQueue,
  useProfileContactGate,
} from '@/features/community/use-posts';
import { useCommunityPostsRealtime } from '@/features/community/use-post-realtime';
import {
  useDiscoverLocation,
  type LocationAccessStatus,
} from '@/features/discover/use-discover-location';
import type { Database } from '@/types/database';

type CommunityPostType = Database['public']['Enums']['community_post_type'];
type FeedMode = 'nearby' | 'all';
type TypeFilter = CommunityPostType | 'all';

const C = {
  background: '#0B0B0B',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

function headerLocationLabel(status: LocationAccessStatus, placeLabel: string | null): string {
  if (status === 'ready' && placeLabel !== null) return placeLabel;
  if (status === 'locating' || status === 'idle') return 'Locating…';
  return 'Location unavailable';
}

function LocationGate({
  status,
  message,
  onRetry,
  onOpenSettings,
}: {
  status: LocationAccessStatus;
  message: string | null;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  if (status === 'idle' || status === 'locating') {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={C.mist} />
        <Text style={styles.gateTitle}>Finding your location…</Text>
        <Text style={styles.gateText}>Nearby events use a fixed 50 km radius.</Text>
      </View>
    );
  }

  const showSettings = status === 'blocked' || status === 'services_disabled';
  const actionLabel = showSettings ? 'Open Settings' : status === 'denied' ? 'Enable Location' : 'Try Again';

  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorText}>
        {message ?? 'Location is required to discover nearby events.'}
      </Text>
      <Pressable onPress={() => void (showSettings ? onOpenSettings() : onRetry())}>
        <Text style={styles.errorAction}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [feedMode, setFeedMode] = useState<FeedMode>('nearby');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const location = useDiscoverLocation();
  const contactGate = useProfileContactGate();
  useCommunityPostsRealtime();
  const isModerator = contactGate.data?.isModerator === true;
  const moderationQuery = useModerationQueue({ enabled: isModerator });
  const pendingReviewCount = useMemo(
    () =>
      (moderationQuery.data ?? []).filter((post) => post.status === 'pending_review').length,
    [moderationQuery.data],
  );

  const nearbyQuery = useNearbyPosts(
    feedMode === 'nearby' ? location.coords : null,
    typeFilter,
  );
  const allQuery = useAllPosts(typeFilter);

  const activeQuery = feedMode === 'nearby' ? nearbyQuery : allQuery;
  const posts = activeQuery.data ?? [];

  const subtitle = useMemo(() => {
    if (feedMode === 'nearby') {
      return `Within ${POST_DISCOVERY_RADIUS_M / 1000} km · ${headerLocationLabel(location.status, location.placeLabel)}`;
    }
    return 'All upcoming events';
  }, [feedMode, location.placeLabel, location.status]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={() => void activeQuery.refetch()}
            tintColor={C.mist}
          />
        }
      >
        <View style={{ paddingTop: insets.top + 16 }} className="px-5 pb-5">
          <View className="flex-row justify-between items-start mb-5">
            <View className="flex-1 pr-3">
              <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
                COMMUNITY
              </Text>
              <Text
                className="font-grotesk font-extrabold text-[30px] text-neutral"
                style={{ letterSpacing: -0.8 }}
              >
                Events
              </Text>
              <Text className="font-grotesk text-sm text-neutral/55 mt-2">{subtitle}</Text>
            </View>
            <NotificationBell />
          </View>

          <View className="gap-3 mb-5">
            <SegmentedControl
              options={[
                { value: 'nearby' as const, label: 'Nearby' },
                { value: 'all' as const, label: 'All events' },
              ]}
              value={feedMode}
              onChange={setFeedMode}
            />
            <SegmentedControl
              options={[
                { value: 'all' as const, label: 'All' },
                { value: 'tournament' as const, label: 'Tournaments' },
                { value: 'training' as const, label: 'Training' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </View>

          {isModerator ? (
            <Pressable
              onPress={() => router.push(buildModerationRoute())}
              className="mb-4 h-12 rounded-xl bg-surface-1 border border-neutral/10 px-4 flex-row items-center justify-between"
            >
              <Text className="font-grotesk text-sm font-semibold text-neutral">Moderation queue</Text>
              <View className="flex-row items-center gap-2">
                {pendingReviewCount > 0 ? (
                  <View className="min-w-[22px] h-[22px] rounded-full bg-warning items-center justify-center px-1.5">
                    <Text className="font-mono-bold text-[10px] text-background">
                      {pendingReviewCount > 99 ? '99+' : String(pendingReviewCount)}
                    </Text>
                  </View>
                ) : null}
                <Ionicons name="shield-outline" size={18} color={C.dim} />
              </View>
            </Pressable>
          ) : null}
        </View>

        {feedMode === 'nearby' && location.status !== 'ready' ? (
          <LocationGate
            status={location.status}
            message={location.errorMessage}
            onRetry={() => void location.retry()}
            onOpenSettings={() => void location.openSettings()}
          />
        ) : activeQuery.isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={C.mist} />
          </View>
        ) : activeQuery.isError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {activeQuery.error instanceof Error
                ? activeQuery.error.message
                : 'Could not load community posts.'}
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={28} color={C.faint} />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>
              {feedMode === 'nearby'
                ? 'No approved posts nearby. Try All events or publish the first one.'
                : 'No approved posts yet. Be the first to publish a tournament or training session.'}
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostSummaryCard
              key={post.id}
              post={post}
              onPress={() => router.push(buildPostDetailRoute(post.id))}
            />
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push(buildCreatePostRoute())}
        style={[styles.fab, { bottom: insets.bottom + 88 }]}
        accessibilityRole="button"
        accessibilityLabel="Publish post"
      >
        <Ionicons name="add" size={24} color={C.mist} />
        <Text style={styles.fabText}>Publish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 10,
  },
  gateTitle: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    fontWeight: '700',
  },
  gateText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    textAlign: 'center',
  },
  errorCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: '#141417',
    gap: 10,
  },
  errorText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
  },
  errorAction: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    fontWeight: '700',
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
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2B396D',
    borderWidth: 1,
    borderColor: '#5E70B8',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fabText: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    fontWeight: '700',
  },
});
