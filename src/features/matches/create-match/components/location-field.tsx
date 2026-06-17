import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text, TextInput } from '@/tw';
import { useLocationAccess } from '@/features/location/use-location-access';
import {
  formatCoordsLabel,
  parseCoordsFromText,
  resolvePlaceLabel,
  type Coords,
} from '@/lib/location';
import { SectionLabel } from './section-label';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type LocationFieldProps = {
  venueName: string;
  onVenueNameChange: (value: string) => void;
  coords: Coords | null;
  onCoordsChange: (coords: Coords | null) => void;
  placeLabel: string | null;
  onPlaceLabelChange: (label: string | null) => void;
};

export function LocationField({
  venueName,
  onVenueNameChange,
  coords,
  onCoordsChange,
  placeLabel,
  onPlaceLabelChange,
}: LocationFieldProps) {
  const locationAccess = useLocationAccess({ persistToProfile: false });
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [awaitingCurrentLocation, setAwaitingCurrentLocation] = useState(false);

  useEffect(() => {
    if (!awaitingCurrentLocation) return;
    if (locationAccess.status === 'ready' && locationAccess.coords !== null) {
      onCoordsChange(locationAccess.coords);
      onPlaceLabelChange(locationAccess.placeLabel);
      setAwaitingCurrentLocation(false);
    }
    if (
      awaitingCurrentLocation &&
      (locationAccess.status === 'denied' ||
        locationAccess.status === 'blocked' ||
        locationAccess.status === 'error' ||
        locationAccess.status === 'services_disabled')
    ) {
      setAwaitingCurrentLocation(false);
    }
  }, [
    awaitingCurrentLocation,
    locationAccess.status,
    locationAccess.coords,
    locationAccess.placeLabel,
    onCoordsChange,
    onPlaceLabelChange,
  ]);

  const applyCoords = useCallback(
    async (nextCoords: Coords): Promise<void> => {
      onCoordsChange(nextCoords);
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: nextCoords.lat,
          longitude: nextCoords.lng,
        });
        onPlaceLabelChange(resolvePlaceLabel(results[0], nextCoords));
      } catch {
        onPlaceLabelChange(formatCoordsLabel(nextCoords));
      }
    },
    [onCoordsChange, onPlaceLabelChange],
  );

  const handleUseCurrentLocation = useCallback(async (): Promise<void> => {
    setPasteError(null);
    setAwaitingCurrentLocation(true);
    await locationAccess.retry();
  }, [locationAccess]);

  const handlePasteCoordinates = useCallback(async (): Promise<void> => {
    setPasteError(null);
    setIsPasting(true);
    try {
      const text = await Clipboard.getStringAsync();
      const parsed = parseCoordsFromText(text);
      if (!parsed.ok) {
        setPasteError(parsed.message);
        return;
      }
      await applyCoords(parsed.coords);
    } catch {
      setPasteError('Could not read clipboard.');
    } finally {
      setIsPasting(false);
    }
  }, [applyCoords]);

  const displayCoords = coords ?? locationAccess.coords;
  const displayLabel = placeLabel ?? locationAccess.placeLabel;
  const isLocating = locationAccess.isLocating || isPasting || awaitingCurrentLocation;
  const errorMessage = pasteError ?? locationAccess.errorMessage;

  return (
    <View>
      <SectionLabel>Location</SectionLabel>
      <TextInput
        value={venueName}
        onChangeText={onVenueNameChange}
        placeholder="Club Norte · Court 3"
        placeholderTextColor={PLACEHOLDER_COLOR}
        className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral mb-3"
      />

      <View className="rounded-xl bg-surface-1 border border-neutral/10 px-4 py-3 mb-3">
        {isLocating ? (
          <View className="flex-row items-center gap-3">
            <ActivityIndicator color="#E4E4E4" size="small" />
            <Text className="font-grotesk text-sm text-neutral/60">Fetching location…</Text>
          </View>
        ) : displayCoords !== null ? (
          <View>
            {displayLabel !== null ? (
              <Text className="font-grotesk text-sm text-neutral mb-1">{displayLabel}</Text>
            ) : null}
            <Text className="font-mono text-[11px] tracking-[0.08em] text-neutral/60">
              {formatCoordsLabel(displayCoords)}
            </Text>
          </View>
        ) : (
          <Text className="font-grotesk text-sm text-neutral/60">
            Set a map pin so players can find this match.
          </Text>
        )}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => void handleUseCurrentLocation()}
          disabled={isLocating}
          className="flex-1 h-11 rounded-xl bg-surface-2 border border-neutral/10 items-center justify-center flex-row gap-2"
        >
          <Ionicons name="locate" size={16} color="rgba(228,228,228,0.60)" />
          <Text className="font-grotesk text-sm text-neutral/60">Current location</Text>
        </Pressable>
        <Pressable
          onPress={() => void handlePasteCoordinates()}
          disabled={isLocating}
          className="flex-1 h-11 rounded-xl bg-surface-2 border border-neutral/10 items-center justify-center flex-row gap-2"
        >
          <Ionicons name="clipboard-outline" size={16} color="rgba(228,228,228,0.60)" />
          <Text className="font-grotesk text-sm text-neutral/60">Paste coords</Text>
        </Pressable>
      </View>

      {errorMessage !== null ? (
        <Text className="font-grotesk text-sm text-warning mt-2">{errorMessage}</Text>
      ) : null}
    </View>
  );
}
