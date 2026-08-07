import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/tw';
import { useLocationAccess } from '@/features/location/use-location-access';
import type { Coords } from '@/lib/location';
import { PlaceMapView, type PlaceMapHandle } from './place-map-view';
import {
  placeToPickerValue,
  type PlacePickerValue,
  type SelectedPlace,
} from './place-selection';
import { loadRecentVenues, rememberRecentVenue } from './recent-venues';
import { reverseGeocodePin } from './reverse-pin-location';
import { usePlaceSearch } from './use-place-search';

const DEFAULT_COORDS: Coords = { lat: -27.451, lng: -58.987 };
const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.35)';
const ICON_COLOR = '#E4E4E4';
const MUTED_ICON_COLOR = 'rgba(228,228,228,0.5)';

type PlacePickerProps = {
  visible: boolean;
  initialValue: PlacePickerValue | null;
  onClose: () => void;
  onConfirm: (value: PlacePickerValue) => void;
};

export function PlacePicker({ visible, initialValue, onClose, onConfirm }: PlacePickerProps) {
  const insets = useSafeAreaInsets();
  const location = useLocationAccess({ requestOnMount: false, persistToProfile: false });
  const mapRef = useRef<PlaceMapHandle>(null);

  const [recentVenues, setRecentVenues] = useState<PlacePickerValue[]>([]);
  const [draft, setDraft] = useState<PlacePickerValue | null>(initialValue);
  const [resolving, setResolving] = useState(false);
  const [confirmingRecentId, setConfirmingRecentId] = useState<string | null>(null);
  const [initialCoords, setInitialCoords] = useState<Coords>(
    () => initialValue?.coords ?? DEFAULT_COORDS,
  );
  const [openCount, setOpenCount] = useState(0);

  const hasOpenedRef = useRef(false);
  const didCenterOnUserRef = useRef(false);

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
    clearSuggestions,
  } = usePlaceSearch({ biasCoords });

  const locationBlocked =
    location.status === 'denied' ||
    location.status === 'blocked' ||
    location.status === 'services_disabled';

  const openPicker = useCallback(async (): Promise<void> => {
    setDraft(initialValue);
    setInitialCoords(initialValue?.coords ?? location.coords ?? DEFAULT_COORDS);
    setOpenCount((count) => count + 1);
    setQuery('');
    clearSuggestions();
    setRecentVenues(await loadRecentVenues());
    didCenterOnUserRef.current = initialValue !== null;
    void location.retry();
  }, [clearSuggestions, initialValue, location, setQuery]);

  useEffect(() => {
    if (!visible) {
      hasOpenedRef.current = false;
      return;
    }
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    void openPicker();
  }, [visible, openPicker]);

  // Center on the user the first time real coordinates arrive (only when the
  // host hasn't already picked a place and hasn't started interacting).
  useEffect(() => {
    if (!visible) return;
    if (didCenterOnUserRef.current) return;
    if (location.coords === null || draft !== null) return;
    didCenterOnUserRef.current = true;
    mapRef.current?.animateToCoords(location.coords);
  }, [visible, location.coords, draft]);

  const resolveAt = useCallback(async (coords: Coords): Promise<void> => {
    setResolving(true);
    try {
      const geocoded = await reverseGeocodePin(coords);
      setDraft({
        placeId: null,
        coords: geocoded.coords,
        venueName: geocoded.venueName ?? geocoded.formattedAddress ?? 'Dropped pin',
        formattedAddress: geocoded.formattedAddress,
      });
    } finally {
      setResolving(false);
    }
  }, []);

  const handlePressMap = useCallback(
    (coords: Coords): void => {
      Keyboard.dismiss();
      clearSuggestions();
      didCenterOnUserRef.current = true;
      void resolveAt(coords);
    },
    [clearSuggestions, resolveAt],
  );

  const handleDragMarkerEnd = useCallback(
    (coords: Coords): void => {
      didCenterOnUserRef.current = true;
      void resolveAt(coords);
    },
    [resolveAt],
  );

  const applySelectedPlace = useCallback((place: SelectedPlace): void => {
    const next = placeToPickerValue(place);
    setDraft(next);
    didCenterOnUserRef.current = true;
    mapRef.current?.animateToCoords(next.coords);
  }, []);

  const handleSelectSuggestion = useCallback(
    async (placeId: string, selectFn: () => Promise<SelectedPlace | null>): Promise<void> => {
      Keyboard.dismiss();
      const place = await selectFn();
      if (place === null) return;
      setQuery('');
      clearSuggestions();
      applySelectedPlace(place);
    },
    [applySelectedPlace, clearSuggestions, setQuery],
  );

  const handleSelectRecent = useCallback(
    (item: PlacePickerValue): void => {
      Keyboard.dismiss();
      if (item.placeId === null) {
        setDraft(item);
        didCenterOnUserRef.current = true;
        mapRef.current?.animateToCoords(item.coords);
        return;
      }
      const placeId = item.placeId;
      setConfirmingRecentId(placeId);
      void resolveRecentPlace(placeId)
        .then((place) => {
          if (place !== null) {
            applySelectedPlace(place);
          } else {
            setDraft(item);
            didCenterOnUserRef.current = true;
            mapRef.current?.animateToCoords(item.coords);
          }
        })
        .finally(() => setConfirmingRecentId(null));
    },
    [applySelectedPlace, resolveRecentPlace],
  );

  const handleRecenter = useCallback((): void => {
    if (location.coords === null) {
      void location.retry();
      return;
    }
    mapRef.current?.animateToCoords(location.coords);
  }, [location]);

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

  const showRecents =
    draft === null && suggestions.length === 0 && query.trim().length === 0 && recentVenues.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? (
        <RNView style={styles.root}>
          <PlaceMapView
            key={openCount}
            ref={mapRef}
            initialCoords={initialCoords}
            markerCoords={draft?.coords ?? null}
            onPressMap={handlePressMap}
            onDragMarkerEnd={handleDragMarkerEnd}
            showsUserLocation={!locationBlocked}
          />

          <RNView style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Top: floating search */}
            <RNView style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
              <RNView style={styles.searchRow}>
                <Pressable
                  onPress={onClose}
                  style={styles.iconButton}
                  className="items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Close location picker"
                >
                  <Ionicons name="arrow-back" size={22} color={ICON_COLOR} />
                </Pressable>

                <RNView style={styles.searchInputWrap}>
                  <Ionicons name="search" size={18} color={MUTED_ICON_COLOR} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search club or address"
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    returnKeyType="search"
                    onSubmitEditing={() => void runSearch()}
                    style={styles.searchInput}
                  />
                  {isSearching ? (
                    <ActivityIndicator color={ICON_COLOR} size="small" />
                  ) : query.length > 0 ? (
                    <Pressable
                      onPress={() => {
                        setQuery('');
                        clearSuggestions();
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <Ionicons name="close-circle" size={18} color={MUTED_ICON_COLOR} />
                    </Pressable>
                  ) : null}
                </RNView>
              </RNView>

              {suggestions.length > 0 ? (
                <RNView style={styles.dropdown}>
                  <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
                    {suggestions.map((item, index) => (
                      <Pressable
                        key={item.placeId}
                        onPress={() =>
                          void handleSelectSuggestion(item.placeId, () => selectSuggestion(item))
                        }
                        className="px-4 py-3 flex-row items-center gap-3"
                        style={index > 0 ? styles.rowDivider : undefined}
                      >
                        <Ionicons name="location-outline" size={18} color={MUTED_ICON_COLOR} />
                        <RNView style={styles.flex1}>
                          <Text className="font-grotesk text-base text-neutral" numberOfLines={1}>
                            {item.primaryText}
                          </Text>
                          {item.secondaryText !== null ? (
                            <Text
                              className="font-grotesk text-sm text-neutral/50 mt-0.5"
                              numberOfLines={1}
                            >
                              {item.secondaryText}
                            </Text>
                          ) : null}
                        </RNView>
                      </Pressable>
                    ))}
                  </ScrollView>
                </RNView>
              ) : searchError !== null ? (
                <RNView style={styles.errorCard}>
                  <Ionicons name="alert-circle-outline" size={16} color="#E0A458" />
                  <Text className="font-grotesk text-sm text-warning flex-1">{searchError}</Text>
                </RNView>
              ) : null}
            </RNView>

            {/* Middle: floating controls above the sheet */}
            <RNView style={styles.controlsArea} pointerEvents="box-none">
              <Pressable
                onPress={handleRecenter}
                style={styles.recenterButton}
                className="items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Center on my location"
              >
                {location.isLocating ? (
                  <ActivityIndicator color={ICON_COLOR} size="small" />
                ) : (
                  <Ionicons name="locate" size={20} color={ICON_COLOR} />
                )}
              </Pressable>
            </RNView>

            {/* Bottom: sheet with selection / recents / confirm */}
            <RNView style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <RNView style={styles.grabber} />

              {showRecents ? (
                <RNView style={styles.recentsWrap}>
                  <Text className="font-mono text-[10px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
                    Recent venues
                  </Text>
                  {recentVenues.slice(0, 3).map((item) => {
                    const loading = confirmingRecentId === item.placeId;
                    return (
                      <Pressable
                        key={item.placeId ?? `${item.coords.lat},${item.coords.lng}`}
                        onPress={() => handleSelectRecent(item)}
                        className="py-3 flex-row items-center gap-3"
                      >
                        <Ionicons name="time-outline" size={18} color={MUTED_ICON_COLOR} />
                        <RNView style={styles.flex1}>
                          <Text className="font-grotesk text-base text-neutral" numberOfLines={1}>
                            {item.venueName}
                          </Text>
                          {item.formattedAddress !== null ? (
                            <Text
                              className="font-grotesk text-sm text-neutral/50 mt-0.5"
                              numberOfLines={1}
                            >
                              {item.formattedAddress}
                            </Text>
                          ) : null}
                        </RNView>
                        {loading ? <ActivityIndicator color={ICON_COLOR} size="small" /> : null}
                      </Pressable>
                    );
                  })}
                </RNView>
              ) : draft !== null ? (
                <RNView>
                  <RNView style={styles.selectedRow}>
                    <RNView style={styles.selectedPin}>
                      <Ionicons name="location" size={20} color="#7488D8" />
                    </RNView>
                    <RNView style={styles.flex1}>
                      <Text className="font-grotesk font-bold text-base text-neutral" numberOfLines={1}>
                        {resolving ? 'Locating…' : draft.venueName}
                      </Text>
                      {draft.formattedAddress !== null ? (
                        <Text
                          className="font-grotesk text-sm text-neutral/55 mt-0.5"
                          numberOfLines={2}
                        >
                          {draft.formattedAddress}
                        </Text>
                      ) : null}
                    </RNView>
                  </RNView>
                  <Text className="font-grotesk text-xs text-neutral/40 mt-2 mb-3">
                    Drag the pin or tap the map to fine-tune.
                  </Text>
                </RNView>
              ) : (
                <RNView style={styles.hintWrap}>
                  <Ionicons name="map-outline" size={20} color={MUTED_ICON_COLOR} />
                  <Text className="font-grotesk text-sm text-neutral/55 flex-1">
                    Search for a club, or tap the map to drop a pin.
                  </Text>
                </RNView>
              )}

              <Pressable
                onPress={handleConfirm}
                disabled={draft === null || resolving}
                className={[
                  'rounded-2xl items-center justify-center flex-row gap-2 mt-1',
                  draft === null || resolving ? 'bg-surface-3' : 'bg-primary',
                ].join(' ')}
                style={styles.confirmButton}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={draft === null || resolving ? MUTED_ICON_COLOR : ICON_COLOR}
                />
                <Text
                  className={[
                    'font-grotesk font-bold text-base',
                    draft === null || resolving ? 'text-neutral/40' : 'text-neutral',
                  ].join(' ')}
                >
                  Confirm location
                </Text>
              </Pressable>
            </RNView>
          </RNView>
        </RNView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  topBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1B1C21',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
  },
  searchInputWrap: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1B1C21',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#E4E4E4',
    fontSize: 16,
    padding: 0,
  },
  dropdown: {
    maxHeight: 260,
    borderRadius: 16,
    backgroundColor: '#1B1C21',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
    overflow: 'hidden',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#1B1C21',
    borderWidth: 1,
    borderColor: 'rgba(224,164,88,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(228,228,228,0.08)',
  },
  controlsArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  recenterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1B1C21',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
  },
  sheet: {
    backgroundColor: '#141417',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(228,228,228,0.18)',
    marginBottom: 14,
  },
  recentsWrap: {
    marginBottom: 6,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectedPin: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(116,136,216,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  confirmButton: {
    height: 52,
  },
  flex1: {
    flex: 1,
  },
});
