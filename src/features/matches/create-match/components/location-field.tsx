import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text, TextInput } from '@/tw';
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
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);

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
        {isPasting ? (
          <View className="flex-row items-center gap-3">
            <ActivityIndicator color="#E4E4E4" size="small" />
            <Text className="font-grotesk text-sm text-neutral/60">Reading coordinates…</Text>
          </View>
        ) : coords !== null ? (
          <View>
            {placeLabel !== null ? (
              <Text className="font-grotesk text-sm text-neutral mb-1">{placeLabel}</Text>
            ) : null}
            <Text className="font-mono text-[11px] tracking-[0.08em] text-neutral/60">
              {formatCoordsLabel(coords)}
            </Text>
          </View>
        ) : (
          <Text className="font-grotesk text-sm text-neutral/60">
            Paste coordinates so players can find this match.
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => void handlePasteCoordinates()}
        disabled={isPasting}
        className="h-11 rounded-xl bg-surface-2 border border-neutral/10 items-center justify-center flex-row gap-2"
      >
        <Ionicons name="clipboard-outline" size={16} color="rgba(228,228,228,0.60)" />
        <Text className="font-grotesk text-sm text-neutral/60">Paste coords</Text>
      </Pressable>

      {pasteError !== null ? (
        <Text className="font-grotesk text-sm text-warning mt-2">{pasteError}</Text>
      ) : null}
    </View>
  );
}
