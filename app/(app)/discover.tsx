import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView as TwScrollView, View, Text, Pressable } from '@/tw';
import { useDiscoverMatches, type MatchSummary } from '@/features/matches/use-matches';
import { MatchSummaryCard } from '@/features/matches/components/match-summary-card';
import { useDiscoverMatchesRealtime } from '@/features/matches/use-match-realtime';
import { NotificationBell } from '@/components/notification-bell';
import { SearchRadiusSlider } from '@/features/discover/components/search-radius-slider';
import { DiscoverMap } from '@/features/discover/components/discover-map';
import { SEARCH_RADIUS_DEFAULT_KM } from '@/features/discover/search-radius';
import {
  CATEGORY_TIER_LABEL,
  categoryToTier,
  type PadelCategoryTier,
} from '@/lib/padel-category';
import type { Coords } from '@/lib/location';
import {
  useDiscoverLocation,
  type LocationAccessStatus,
} from '@/features/discover/use-discover-location';

type CategoryFilter = 'All' | PadelCategoryTier;
type ViewMode = 'list' | 'map';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface2: '#1B1C21',
  surface3: '#232429',
  blue: '#2B396D',
  blueMid: '#5E70B8',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  label: 'rgba(228,228,228,0.72)',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  ghost: 'rgba(228,228,228,0.20)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  warning: '#E0B15B',
} as const;

function matchCategoryTier(match: MatchSummary): PadelCategoryTier {
  return categoryToTier(match.category_max);
}

function headerLocationLabel(
  status: LocationAccessStatus,
  placeLabel: string | null,
): string {
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
        <Text style={styles.gateText}>
          We need your location to show nearby padel matches.
        </Text>
      </View>
    );
  }

  const showSettings = status === 'blocked' || status === 'services_disabled';
  const actionLabel = showSettings ? 'Open Settings' : status === 'denied' ? 'Enable Location' : 'Try Again';

  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorText}>
        {message ?? 'Location is required to discover nearby matches.'}
      </Text>
      <Pressable
        onPress={() => void (showSettings ? onOpenSettings() : onRetry())}
      >
        <Text style={styles.errorAction}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function FilterChips({
  value,
  onChange,
}: {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}) {
  const chips: CategoryFilter[] = ['All', 'advanced', 'intermediate', 'beginner'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
      contentContainerStyle={styles.chipRow}
    >
      <View style={styles.filterIconChip}>
        <Ionicons name="options-outline" size={17} color={C.dim} />
      </View>
      {chips.map((chip) => {
        const active = value === chip;
        return (
          <Pressable
            key={chip}
            onPress={() => onChange(chip)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {chip === 'All' ? 'All levels' : CATEGORY_TIER_LABEL[chip]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <View style={styles.viewToggle}>
      {(['list', 'map'] as const).map((mode) => {
        const active = value === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[styles.viewToggleItem, active && styles.viewToggleItemActive]}
          >
            <Ionicons
              name={mode === 'list' ? 'list' : 'map-outline'}
              size={18}
              color={active ? C.mist : C.faint}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
  const [searchRadiusKm, setSearchRadiusKm] = useState(SEARCH_RADIUS_DEFAULT_KM);
  const [queryCenter, setQueryCenter] = useState<Coords | null>(null);
  const [mapCenterDraft, setMapCenterDraft] = useState<Coords | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    if (coords !== null) {
      setQueryCenter(coords);
      setMapCenterDraft(coords);
    }
  }, [coords?.lat, coords?.lng]);

  useDiscoverMatchesRealtime();
  const { data: matches, isPending, isRefetching, refetch, error } = useDiscoverMatches(
    locationReady ? queryCenter : null,
    searchRadiusKm,
  );

  const filteredMatches = useMemo(() => {
    const source = matches ?? [];
    return source.filter(
      (match) => categoryFilter === 'All' || matchCategoryTier(match) === categoryFilter,
    );
  }, [matches, categoryFilter]);

  const locationLabel = headerLocationLabel(locationStatus, placeLabel);

  function handleRefresh() {
    if (locationReady) {
      void refetch();
      return;
    }
    void retryLocation();
  }

  const isRefreshing = locationReady ? isRefetching : locationStatus === 'locating';

  function renderListBody() {
    if (isPending) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.mist} />
        </View>
      );
    }

    if (error !== null) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Could not load matches.</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={styles.errorAction}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    if (filteredMatches.length > 0) {
      return filteredMatches.map((match) => (
        <MatchSummaryCard
          key={match.id}
          match={match}
          distanceM={match.distanceM}
          onPress={() => router.push(`/(app)/match-detail?id=${match.id}`)}
        />
      ));
    }

    return (
      <View style={styles.emptyCard}>
        <Ionicons name="search-outline" size={26} color={C.faint} />
        <Text style={styles.emptyTitle}>No matches in range</Text>
        <Text style={styles.emptyText}>Widen your radius or switch category level.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={C.blueHi} />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>
          <Text style={styles.title}>Discover</Text>
        </View>
        <View style={styles.headerActions}>
          <NotificationBell />
        </View>
      </View>

      {!locationReady ? (
        <TwScrollView
          className="flex-1 bg-background"
          contentContainerStyle={styles.gateContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={C.mist}
            />
          }
        >
          <LocationGate
            status={locationStatus}
            message={errorMessage}
            onRetry={() => void retryLocation()}
            onOpenSettings={() => void openSettings()}
          />
        </TwScrollView>
      ) : (
        <>
          {viewMode === 'list' ? (
            <TwScrollView
              className="flex-1 bg-background"
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={C.mist}
                />
              }
            >
              {saveWarning !== null ? (
                <View style={styles.saveWarningCard}>
                  <Text style={styles.saveWarningText}>{saveWarning}</Text>
                </View>
              ) : null}

              <SearchRadiusSlider radiusKm={searchRadiusKm} onRadiusCommit={setSearchRadiusKm} />
              <FilterChips value={categoryFilter} onChange={setCategoryFilter} />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {filteredMatches.length} Open Nearby
                </Text>
                <View style={styles.sectionRight}>
                  {isRefetching ? <ActivityIndicator color={C.mist} size="small" /> : null}
                  <ViewToggle value={viewMode} onChange={setViewMode} />
                </View>
              </View>

              {renderListBody()}
            </TwScrollView>
          ) : (
            <View style={styles.mapLayout}>
              <View style={styles.mapControls}>
                {saveWarning !== null ? (
                  <View style={styles.saveWarningCard}>
                    <Text style={styles.saveWarningText}>{saveWarning}</Text>
                  </View>
                ) : null}

                <SearchRadiusSlider radiusKm={searchRadiusKm} onRadiusCommit={setSearchRadiusKm} />
                <FilterChips value={categoryFilter} onChange={setCategoryFilter} />

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {filteredMatches.length} Open Nearby
                  </Text>
                  <View style={styles.sectionRight}>
                    {isRefetching ? <ActivityIndicator color={C.mist} size="small" /> : null}
                    <ViewToggle value={viewMode} onChange={setViewMode} />
                  </View>
                </View>
              </View>

              <View style={styles.mapBody}>
                {isPending ? (
                  <View style={styles.centerState}>
                    <ActivityIndicator color={C.mist} />
                  </View>
                ) : error !== null ? (
                  <View style={styles.errorCard}>
                    <Text style={styles.errorText}>Could not load matches.</Text>
                    <Pressable onPress={() => void refetch()}>
                      <Text style={styles.errorAction}>Try again</Text>
                    </Pressable>
                  </View>
                ) : coords !== null && queryCenter !== null ? (
                  <DiscoverMap
                    matches={filteredMatches}
                    userCoords={coords}
                    queryCenter={queryCenter}
                    searchRadiusKm={searchRadiusKm}
                    onMapCenterChange={setMapCenterDraft}
                    onSearchThisArea={() => {
                      if (mapCenterDraft !== null) {
                        setQueryCenter(mapCenterDraft);
                      }
                    }}
                    onRecenter={() => {
                      if (coords !== null) {
                        setQueryCenter(coords);
                        setMapCenterDraft(coords);
                      }
                    }}
                    onOpenMatch={(matchId) => router.push(`/(app)/match-detail?id=${matchId}`)}
                  />
                ) : null}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  gateContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: C.background,
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  mapLayout: {
    flex: 1,
  },
  mapControls: {
    backgroundColor: C.background,
  },
  mapBody: {
    flex: 1,
  },
  chipScroll: {
    marginBottom: 22,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterIconChip: {
    width: 43,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    height: 39,
    borderRadius: 11,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  chipText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
    color: C.dim,
  },
  chipTextActive: {
    color: C.mist,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
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
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 11,
    padding: 3,
  },
  viewToggleItem: {
    width: 38,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleItemActive: {
    backgroundColor: C.blue,
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
});
