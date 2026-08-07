import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Supercluster from 'supercluster';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from '@/tw';
import type { Coords } from '@/lib/location';
import { formatMatchTime } from '@/lib/match-time';
import type { MatchSummary } from '@/features/matches/use-matches';
import {
  DISCOVER_DARK_MAP_STYLE,
  coordsRoughlyEqual,
  coordsToRegion,
  deltaFromRadiusKm,
  matchesWithCoords,
  regionToBBox,
  regionToCoords,
  regionToZoom,
  type MapMatchPoint,
} from '@/features/discover/discover-map-utils';
import { MapClusterMarker } from '@/features/discover/components/map-cluster-marker';
import {
  MAP_MATCH_CARD_GAP,
  MapMatchCard,
} from '@/features/discover/components/map-match-card';
import { MapMatchMarker } from '@/features/discover/components/map-match-marker';

const MAP_H_MARGIN = 16;
const CARD_PEEK = 30;

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  blue: '#2B396D',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

type ClusterFeatureProperties = {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: number | string;
  matchId?: string;
};

type DiscoverMapProps = {
  matches: MatchSummary[];
  userCoords: Coords;
  queryCenter: Coords;
  searchRadiusKm: number;
  onMapCenterChange: (coords: Coords) => void;
  onSearchThisArea: () => void;
  onRecenter: () => void;
  onOpenMatch: (matchId: string) => void;
};

function regionFromQuery(queryCenter: Coords, searchRadiusKm: number): Region {
  const delta = deltaFromRadiusKm(searchRadiusKm);
  return coordsToRegion(queryCenter, delta);
}

export function DiscoverMap({
  matches,
  userCoords,
  queryCenter,
  searchRadiusKm,
  onMapCenterChange,
  onSearchThisArea,
  onRecenter,
  onOpenMatch,
}: DiscoverMapProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList<MapMatchPoint> | null>(null);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCarouselScrollingRef = useRef(false);

  const containerWidth = windowWidth - MAP_H_MARGIN * 2;
  const cardWidth = Math.min(360, Math.round(containerWidth - CARD_PEEK * 2));
  const cardStride = cardWidth + MAP_MATCH_CARD_GAP;
  const carouselSidePadding = Math.max(0, (containerWidth - cardWidth) / 2);

  const mapMatches = useMemo(() => matchesWithCoords(matches), [matches]);
  const [region, setRegion] = useState<Region>(() => regionFromQuery(queryCenter, searchRadiusKm));
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    () => mapMatches[0]?.id ?? null,
  );

  const showSearchThisArea = !coordsRoughlyEqual(regionToCoords(region), queryCenter);

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<ClusterFeatureProperties>({
      radius: 56,
      maxZoom: 16,
      minZoom: 0,
    });

    index.load(
      mapMatches.map((match) => ({
        type: 'Feature',
        properties: { cluster: false, matchId: match.id },
        geometry: {
          type: 'Point',
          coordinates: [match.coords.lng, match.coords.lat],
        },
      })),
    );

    return index;
  }, [mapMatches]);

  const clusters = useMemo(() => {
    const bbox = regionToBBox(region);
    const zoom = regionToZoom(region);
    return clusterIndex.getClusters(bbox, zoom);
  }, [clusterIndex, region]);

  const matchById = useMemo(
    () => new Map(mapMatches.map((match) => [match.id, match])),
    [mapMatches],
  );

  useEffect(() => {
    if (mapMatches.length === 0) {
      setSelectedMatchId(null);
      return;
    }

    if (selectedMatchId === null || matchById.get(selectedMatchId) === undefined) {
      setSelectedMatchId(mapMatches[0].id);
    }
  }, [mapMatches, matchById, selectedMatchId]);

  useEffect(() => {
    mapRef.current?.animateToRegion(regionFromQuery(queryCenter, searchRadiusKm), 350);
  }, [queryCenter, searchRadiusKm]);

  const scrollCarouselToMatch = useCallback((matchId: string) => {
    const index = mapMatches.findIndex((match) => match.id === matchId);
    if (index < 0) return;
    carouselRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, [mapMatches]);

  const selectMatch = useCallback(
    (matchId: string, options?: { animateMap?: boolean; animateCarousel?: boolean }) => {
      const match = matchById.get(matchId);
      if (match === undefined) return;

      setSelectedMatchId(matchId);

      if (options?.animateMap !== false) {
        mapRef.current?.animateToRegion(coordsToRegion(match.coords, 0.018), 300);
      }

      if (options?.animateCarousel !== false && !isCarouselScrollingRef.current) {
        scrollCarouselToMatch(matchId);
      }
    },
    [matchById, scrollCarouselToMatch],
  );

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region) => {
      setRegion(nextRegion);
      if (regionDebounceRef.current !== null) {
        clearTimeout(regionDebounceRef.current);
      }
      regionDebounceRef.current = setTimeout(() => {
        onMapCenterChange(regionToCoords(nextRegion));
      }, 150);
    },
    [onMapCenterChange],
  );

  const handleClusterPress = useCallback(
    (clusterId: number, latitude: number, longitude: number) => {
      const expansionZoom = clusterIndex.getClusterExpansionZoom(clusterId);
      const longitudeDelta = 360 / 2 ** (expansionZoom + 1);
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: longitudeDelta,
          longitudeDelta,
        },
        300,
      );
    },
    [clusterIndex],
  );

  const handleCarouselScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isCarouselScrollingRef.current = false;
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / cardStride);
      const match = mapMatches[index];
      if (match === undefined) return;
      selectMatch(match.id, { animateCarousel: false });
    },
    [mapMatches, selectMatch, cardStride],
  );

  const renderCarouselItem = useCallback(
    ({ item }: ListRenderItemInfo<MapMatchPoint>) => (
      <View style={{ width: cardWidth, marginRight: MAP_MATCH_CARD_GAP }}>
        <MapMatchCard
          match={item}
          width={cardWidth}
          selected={item.id === selectedMatchId}
          onPress={() => onOpenMatch(item.id)}
        />
      </View>
    ),
    [onOpenMatch, selectedMatchId, cardWidth],
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={regionFromQuery(queryCenter, searchRadiusKm)}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        customMapStyle={Platform.OS === 'android' ? DISCOVER_DARK_MAP_STYLE : undefined}
        userInterfaceStyle="dark"
      >
        {clusters.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;

          if (props.cluster === true && props.cluster_id !== undefined && props.point_count !== undefined) {
            return (
              <MapClusterMarker
                key={`cluster-${props.cluster_id}`}
                clusterId={props.cluster_id}
                latitude={lat}
                longitude={lng}
                count={props.point_count}
                onPress={() => handleClusterPress(props.cluster_id ?? 0, lat, lng)}
              />
            );
          }

          const matchId = props.matchId;
          if (matchId === undefined) return null;
          const match = matchById.get(matchId);
          if (match === undefined) return null;

          return (
            <MapMatchMarker
              key={matchId}
              matchId={matchId}
              coords={match.coords}
              categoryMax={match.category_max}
              label={formatMatchTime(match.starts_at)}
              selected={matchId === selectedMatchId}
              onPress={() => selectMatch(matchId)}
            />
          );
        })}
      </MapView>

      {showSearchThisArea ? (
        <Pressable style={styles.searchAreaPill} onPress={onSearchThisArea}>
          <Ionicons name="refresh-outline" size={15} color={C.mist} />
          <Text style={styles.searchAreaText}>Search this area</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.recenterButton, { top: showSearchThisArea ? 58 : 14 }]}
        onPress={() => {
          onRecenter();
          mapRef.current?.animateToRegion(regionFromQuery(userCoords, searchRadiusKm), 350);
        }}
        accessibilityRole="button"
        accessibilityLabel="Recenter map on your location"
      >
        <Ionicons name="locate-outline" size={20} color={C.mist} />
      </Pressable>

      {mapMatches.length === 0 ? (
        <View style={[styles.emptyOverlay, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={26} color={C.faint} />
            <Text style={styles.emptyTitle}>No matches in range</Text>
            <Text style={styles.emptyText}>Widen your radius or switch category level.</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.carouselWrap, { paddingBottom: 16 }]}>
          <FlatList
            ref={carouselRef}
            data={mapMatches}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={cardStride}
            snapToAlignment="start"
            contentContainerStyle={[
              styles.carouselContent,
              { paddingHorizontal: carouselSidePadding },
            ]}
            onScrollBeginDrag={() => {
              isCarouselScrollingRef.current = true;
            }}
            onMomentumScrollEnd={handleCarouselScrollEnd}
            onScrollToIndexFailed={(info) => {
              carouselRef.current?.scrollToOffset({
                offset: info.index * cardStride,
                animated: true,
              });
            }}
            getItemLayout={(_, index) => ({
              length: cardStride,
              offset: cardStride * index,
              index,
            })}
            renderItem={renderCarouselItem}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: MAP_H_MARGIN,
    marginBottom: 14,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.surface1,
  },
  searchAreaPill: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchAreaText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 13,
    color: C.mist,
  },
  recenterButton: {
    position: 'absolute',
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  carouselContent: {
    alignItems: 'flex-end',
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  emptyCard: {
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 28,
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
