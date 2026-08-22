import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, View, Text, Pressable } from '@/tw';
import { NotificationBell } from '@/components/notification-bell';
import { PostSummaryCard } from '@/features/community/components/post-summary-card';
import {
  CommunityFilterBar,
  type CommunityFeedMode,
  type CommunityTypeFilter,
} from '@/features/community/components/community-filter-bar';
import {
  buildCreatePostRoute,
  buildPostDetailRoute,
  buildModerationRoute,
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
import type { PostSummary } from '@/features/community/use-posts';

type FeedMode = CommunityFeedMode;
type TypeFilter = CommunityTypeFilter;

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  blue: '#2B396D',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  label: 'rgba(228,228,228,0.72)',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  warning: '#E0B15B',
} as const;

function headerLocationLabel(status: LocationAccessStatus, placeLabel: string | null): string {
  if (status === 'ready' && placeLabel !== null) return placeLabel;
  if (status === 'locating' || status === 'idle') return 'Locating…';
  return 'Location unavailable';
}

function feedSubtitle(feedMode: FeedMode): string {
  if (feedMode === 'nearby') return 'Events near you';
  return 'All upcoming events';
}

function sectionTitle(feedMode: FeedMode, count: number): string {
  if (feedMode === 'nearby') return `${count} Events Nearby`;
  return `${count} Upcoming Events`;
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
        <Text style={styles.gateText}>We need your location to show nearby events.</Text>
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

  const {
    status: locationStatus,
    coords,
    placeLabel,
    errorMessage,
    saveWarning,
    retry: retryLocation,
    openSettings,
  } = useDiscoverLocation();
  const locationReady = locationStatus === 'ready' && coords !== null;
  const locationLabel = headerLocationLabel(locationStatus, placeLabel);

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
    feedMode === 'nearby' && locationReady ? coords : null,
    typeFilter,
  );
  const allQuery = useAllPosts(typeFilter);

  const activeQuery = feedMode === 'nearby' ? nearbyQuery : allQuery;
  const posts = activeQuery.data ?? [];
  const showLocationGate = feedMode === 'nearby' && !locationReady;

  const openPost = useCallback(
    (postId: string) => {
      router.push(buildPostDetailRoute(postId));
    },
    [router],
  );

  function handleRefresh() {
    if (feedMode === 'nearby' && !locationReady) {
      void retryLocation();
      return;
    }
    void activeQuery.refetch();
  }

  const isRefreshing =
    feedMode === 'nearby' && !locationReady
      ? locationStatus === 'locating'
      : activeQuery.isRefetching;

  const renderItem = useCallback(
    ({ item }: { item: PostSummary }) => (
      <PostSummaryCard post={item} onPress={() => openPost(item.id)} />
    ),
    [openPost],
  );

  const keyExtractor = useCallback((item: PostSummary) => item.id, []);

  const listHeader = useMemo(
    () => (
      <>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View className="flex-1 pr-3">
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={C.blueHi} />
              <Text style={styles.locationText}>{locationLabel}</Text>
            </View>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>{feedSubtitle(feedMode)}</Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell />
          </View>
        </View>

        {saveWarning !== null ? (
          <View style={styles.saveWarningCard}>
            <Text style={styles.saveWarningText}>{saveWarning}</Text>
          </View>
        ) : null}

        <CommunityFilterBar
          feedMode={feedMode}
          typeFilter={typeFilter}
          onFeedModeChange={setFeedMode}
          onTypeFilterChange={setTypeFilter}
        />

        {isModerator ? (
          <Pressable
            onPress={() => router.push(buildModerationRoute())}
            style={styles.moderationCard}
          >
            <Text style={styles.moderationLabel}>Moderation queue</Text>
            <View style={styles.moderationRight}>
              {pendingReviewCount > 0 ? (
                <View style={styles.moderationBadge}>
                  <Text style={styles.moderationBadgeText}>
                    {pendingReviewCount > 99 ? '99+' : String(pendingReviewCount)}
                  </Text>
                </View>
              ) : null}
              <Ionicons name="shield-outline" size={18} color={C.dim} />
            </View>
          </Pressable>
        ) : null}

        {showLocationGate ? (
          <LocationGate
            status={locationStatus}
            message={errorMessage}
            onRetry={() => void retryLocation()}
            onOpenSettings={() => void openSettings()}
          />
        ) : (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{sectionTitle(feedMode, posts.length)}</Text>
            {activeQuery.isRefetching ? <ActivityIndicator color={C.mist} size="small" /> : null}
          </View>
        )}
      </>
    ),
    [
      activeQuery.isRefetching,
      errorMessage,
      feedMode,
      insets.top,
      isModerator,
      locationLabel,
      locationStatus,
      openSettings,
      pendingReviewCount,
      posts.length,
      retryLocation,
      router,
      saveWarning,
      showLocationGate,
      typeFilter,
    ],
  );

  const listEmpty = useMemo(() => {
    if (showLocationGate) return null;
    if (activeQuery.isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.mist} />
        </View>
      );
    }
    if (activeQuery.isError) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            {activeQuery.error instanceof Error
              ? activeQuery.error.message
              : 'Could not load community posts.'}
          </Text>
          <Pressable onPress={() => void activeQuery.refetch()}>
            <Text style={styles.errorAction}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="megaphone-outline" size={26} color={C.faint} />
        <Text style={styles.emptyTitle}>No events yet</Text>
        <Text style={styles.emptyText}>
          {feedMode === 'nearby'
            ? 'No approved posts nearby. Try All events or publish the first one.'
            : 'No approved posts yet. Be the first to publish a tournament or training session.'}
        </Text>
      </View>
    );
  }, [
    activeQuery,
    feedMode,
    showLocationGate,
  ]);

  return (
    <View className="flex-1 bg-background">
      <FlashList
        data={showLocationGate ? [] : posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={C.mist} />
        }
      />

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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  locationText: {
    fontFamily: 'Space Mono',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 30,
    color: C.mist,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    color: C.dim,
    marginTop: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  moderationCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moderationLabel: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
    color: C.mist,
  },
  moderationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moderationBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.warning,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  moderationBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    color: C.background,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11.5,
    letterSpacing: 2,
    color: C.label,
    textTransform: 'uppercase',
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  gateTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.dim,
    marginTop: 8,
  },
  gateText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 19,
    color: C.faint,
    textAlign: 'center',
  },
  saveWarningCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(224,177,91,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.22)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveWarningText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    color: C.warning,
  },
  errorCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(224,177,91,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.30)',
    borderRadius: 16,
    padding: 16,
  },
  errorText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    color: C.warning,
    marginBottom: 12,
  },
  errorAction: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: C.warning,
  },
  emptyCard: {
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 38,
    alignItems: 'center',
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.hair,
    borderRadius: 20,
  },
  emptyTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14.5,
    color: C.dim,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.dim,
    textTransform: 'uppercase',
    textAlign: 'center',
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
