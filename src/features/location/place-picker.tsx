import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable as RNPressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Region } from 'react-native-maps';
import { Pressable, Text, View } from '@/tw';
import { useLocationAccess } from '@/features/location/use-location-access';
import type { Coords } from '@/lib/location';
import { PlaceMapView, coordsToRegion, regionToCoords } from './place-map-view';
import {
  formatPickerSummary,
  placeToPickerValue,
  type PlacePickerValue,
  type SelectedPlace,
} from './place-selection';
import { loadRecentVenues, rememberRecentVenue } from './recent-venues';
import { reverseGeocodePin } from './reverse-pin-location';
import { usePlaceSearch } from './use-place-search';

const DEFAULT_COORDS: Coords = { lat: -27.451, lng: -58.987 };
const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type PlacePickerProps = {
  visible: boolean;
  initialValue: PlacePickerValue | null;
  onClose: () => void;
  onConfirm: (value: PlacePickerValue) => void;
};

function valueToRegion(value: PlacePickerValue | null, fallback: Coords): Region {
  if (value !== null) return coordsToRegion(value.coords);
  return coordsToRegion(fallback);
}

export function PlacePicker({ visible, initialValue, onClose, onConfirm }: PlacePickerProps) {
  const insets = useSafeAreaInsets();
  const location = useLocationAccess({ requestOnMount: false, persistToProfile: false });

  const [recentVenues, setRecentVenues] = useState<PlacePickerValue[]>([]);
  const [mapRegion, setMapRegion] = useState<Region>(() =>
    valueToRegion(initialValue, DEFAULT_COORDS),
  );
  const [draft, setDraft] = useState<PlacePickerValue | null>(initialValue);
  const [pinResolving, setPinResolving] = useState(false);
  const [confirmingRecentId, setConfirmingRecentId] = useState<string | null>(null);

  const pinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPinResolveRef = useRef(false);
  const hasOpenedRef = useRef(false);

  const biasCoords = useMemo((): Coords | null => {
    if (location.coords !== null) return location.coords;
    if (draft !== null) return draft.coords;
    return DEFAULT_COORDS;
  }, [draft, location.coords]);

  const {
    query,
    setQuery,
    suggestions,
    isSearching,
    searchError,
    runSearch,
    selectSuggestion,
    resolveRecentPlace,
  } = usePlaceSearch({ biasCoords });

  const openPicker = useCallback(async (): Promise<void> => {
    setDraft(initialValue);
    const fallback = location.coords ?? DEFAULT_COORDS;
    const region = valueToRegion(initialValue, fallback);
    setMapRegion(region);
    setRecentVenues(await loadRecentVenues());
    setQuery('');
    if (initialValue === null) {
      skipPinResolveRef.current = true;
      void resolvePinAtCenter(regionToCoords(region));
    }
    void location.retry();
  }, [initialValue, location, resolvePinAtCenter, setQuery]);

  useEffect(() => {
    if (!visible) {
      hasOpenedRef.current = false;
      return;
    }
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    void openPicker();
  }, [visible, openPicker]);

  useEffect(() => {
    if (visible && location.coords !== null && initialValue === null && draft === null) {
      setMapRegion(coordsToRegion(location.coords));
    }
  }, [visible, location.coords, initialValue, draft]);

  const resolvePinAtCenter = useCallback(async (coords: Coords): Promise<void> => {
    setPinResolving(true);
    try {
      const geocoded = await reverseGeocodePin(coords);
      setDraft({
        placeId: null,
        coords: geocoded.coords,
        venueName: geocoded.venueName ?? geocoded.formattedAddress ?? 'Selected location',
        formattedAddress: geocoded.formattedAddress,
      });
    } finally {
      setPinResolving(false);
    }
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: Region): void => {
      setMapRegion(region);
      if (skipPinResolveRef.current) {
        skipPinResolveRef.current = false;
        return;
      }

      if (pinDebounceRef.current !== null) {
        clearTimeout(pinDebounceRef.current);
      }

      pinDebounceRef.current = setTimeout(() => {
        void resolvePinAtCenter(regionToCoords(region));
      }, 350);
    },
    [resolvePinAtCenter],
  );

  const handleSelectSuggestion = useCallback(
    async (placeId: string, selectFn: () => Promise<SelectedPlace | null>): Promise<void> => {
      Keyboard.dismiss();
      const place = await selectFn();
      if (place === null) return;

      skipPinResolveRef.current = true;
      const next = placeToPickerValue(place);
      setDraft(next);
      setMapRegion(coordsToRegion(next.coords));
    },
    [],
  );

  const handleRecenter = useCallback((): void => {
    if (location.coords === null) {
      void location.retry();
      return;
    }
    skipPinResolveRef.current = true;
    setMapRegion(coordsToRegion(location.coords));
    void resolvePinAtCenter(location.coords);
  }, [location, resolvePinAtCenter]);

  const handleConfirm = useCallback((): void => {
    if (draft === null) return;
    void rememberRecentVenue(draft);
    onConfirm({
      venueName: draft.venueName.trim() || draft.formattedAddress?.trim() || 'Selected location',
      coords: draft.coords,
      formattedAddress: draft.formattedAddress,
      placeId: draft.placeId,
    });
    onClose();
  }, [draft, onClose, onConfirm]);

  const summary =
    draft !== null ? formatPickerSummary(draft) : 'Move the map or search for a venue';

  const locationBlocked =
    location.status === 'denied' ||
    location.status === 'blocked' ||
    location.status === 'services_disabled';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <RNView style={[styles.root, { paddingTop: insets.top }]}>
        <RNView style={styles.header}>
          <Pressable
            onPress={onClose}
            className="w-11 h-11 rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close place picker"
          >
            <Ionicons name="close" size={22} color="#E4E4E4" />
          </Pressable>
          <Text className="font-grotesk font-bold text-base text-neutral flex-1 text-center">
            Choose location
          </Text>
          <View className="w-11" />
        </RNView>

        <RNView style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search club or address"
            placeholderTextColor={PLACEHOLDER_COLOR}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
            className="flex-1 h-12 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
            style={styles.searchInput}
          />
          <Pressable
            onPress={() => void runSearch()}
            disabled={isSearching}
            className={[
              'h-12 px-4 rounded-xl items-center justify-center flex-row gap-2',
              isSearching ? 'bg-surface-3' : 'bg-primary',
            ].join(' ')}
          >
            {isSearching ? (
              <ActivityIndicator color="#E4E4E4" size="small" />
            ) : (
              <Ionicons name="search" size={18} color="#E4E4E4" />
            )}
            <Text className="font-grotesk font-bold text-sm text-neutral">Search</Text>
          </Pressable>
        </RNView>

        {searchError !== null ? (
          <Text className="font-grotesk text-sm text-warning px-5 pb-2">{searchError}</Text>
        ) : null}

        <RNView style={styles.mapWrap}>
          <PlaceMapView
            region={mapRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={!locationBlocked}
          />

          <RNView pointerEvents="none" style={styles.pinOverlay}>
            <Ionicons name="location" size={36} color="#7488D8" />
            <RNView style={styles.pinDot} />
          </RNView>

          <Pressable
            onPress={handleRecenter}
            style={styles.recenterButton}
            className="rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Recenter on my location"
          >
            <Ionicons name="locate-outline" size={20} color="#E4E4E4" />
          </Pressable>
        </RNView>

        <RNView style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {suggestions.length > 0 ? (
            <RNView style={styles.suggestionsBox}>
              {suggestions.map((item) => (
                <Pressable
                  key={item.placeId}
                  onPress={() =>
                    void handleSelectSuggestion(item.placeId, () => selectSuggestion(item))
                  }
                  className="px-4 py-3 border-b border-neutral/10"
                >
                  <Text className="font-grotesk text-base text-neutral">{item.primaryText}</Text>
                  {item.secondaryText !== null ? (
                    <Text className="font-grotesk text-sm text-neutral/50 mt-0.5" numberOfLines={2}>
                      {item.secondaryText}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </RNView>
          ) : recentVenues.length > 0 && suggestions.length === 0 && query.trim().length === 0 ? (
            <RNView style={styles.suggestionsBox}>
              <Text className="font-mono text-[10px] tracking-[1.5px] uppercase text-neutral/38 px-4 pt-3 pb-2">
                Recent venues
              </Text>
              {recentVenues.map((item) => {
                const loading = confirmingRecentId === item.placeId;
                return (
                  <Pressable
                    key={item.placeId ?? `${item.coords.lat},${item.coords.lng}`}
                    onPress={() => {
                      if (item.placeId === null) return;
                      setConfirmingRecentId(item.placeId);
                      void handleSelectSuggestion(item.placeId, () =>
                        resolveRecentPlace(item.placeId as string),
                      ).finally(() => setConfirmingRecentId(null));
                    }}
                    className="px-4 py-3 border-b border-neutral/10 flex-row items-center gap-3"
                  >
                    <Ionicons name="time-outline" size={18} color="rgba(228,228,228,0.38)" />
                    <RNView style={styles.flex1}>
                      <Text className="font-grotesk text-base text-neutral">{item.venueName}</Text>
                      {item.formattedAddress !== null ? (
                        <Text className="font-grotesk text-sm text-neutral/50 mt-0.5" numberOfLines={2}>
                          {item.formattedAddress}
                        </Text>
                      ) : null}
                    </RNView>
                    {loading ? <ActivityIndicator color="#E4E4E4" size="small" /> : null}
                  </Pressable>
                );
              })}
            </RNView>
          ) : null}

          <RNView style={styles.confirmCard}>
            <Text className="font-grotesk text-sm text-neutral/60 mb-1">Selected</Text>
            <Text className="font-grotesk text-base text-neutral mb-3" numberOfLines={3}>
              {pinResolving ? 'Updating address…' : summary}
            </Text>
            <Pressable
              onPress={handleConfirm}
              disabled={draft === null || pinResolving || isSearching}
              className={[
                'h-12 rounded-xl items-center justify-center',
                draft === null || pinResolving || isSearching ? 'bg-surface-3' : 'bg-primary',
              ].join(' ')}
            >
              <Text className="font-grotesk font-bold text-base text-neutral">Confirm location</Text>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  searchInput: {
    color: '#E4E4E4',
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
  },
  pinOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#7488D8',
    marginTop: -6,
  },
  recenterButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  suggestionsBox: {
    maxHeight: 160,
    borderRadius: 16,
    backgroundColor: '#1B1C21',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
    overflow: 'hidden',
  },
  confirmCard: {
    borderRadius: 16,
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
    padding: 16,
  },
  flex1: {
    flex: 1,
  },
});
