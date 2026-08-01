import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text, TextInput } from '@/tw';
import { type Coords } from '@/lib/location';
import { PlacePicker } from './place-picker';
import { formatPickerSummary, type PlacePickerValue } from './place-selection';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type LocationFieldProps = {
  venueName: string;
  formattedAddress: string | null;
  placeId: string | null;
  onVenueNameChange: (value: string) => void;
  coords: Coords | null;
  onCoordsChange: (coords: Coords | null) => void;
  onFormattedAddressChange: (value: string | null) => void;
  onPlaceIdChange: (value: string | null) => void;
};

function buildInitialValue(
  venueName: string,
  coords: Coords | null,
  formattedAddress: string | null,
  placeId: string | null,
): PlacePickerValue | null {
  if (coords === null) return null;
  return {
    venueName,
    coords,
    formattedAddress,
    placeId,
  };
}

export function LocationField({
  venueName,
  formattedAddress,
  placeId,
  onVenueNameChange,
  coords,
  onCoordsChange,
  onFormattedAddressChange,
  onPlaceIdChange,
}: LocationFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const pickerSeed = useMemo(
    () => buildInitialValue(venueName, coords, formattedAddress, placeId),
    [coords, formattedAddress, placeId, venueName],
  );

  const summaryLabel = useMemo((): string => {
    if (coords === null) return 'Search or pick on map';
    return formatPickerSummary({
      venueName,
      coords,
      formattedAddress,
      placeId,
    });
  }, [coords, formattedAddress, placeId, venueName]);

  const handleConfirm = useCallback(
    (value: PlacePickerValue): void => {
      onCoordsChange(value.coords);
      onVenueNameChange(value.venueName);
      onFormattedAddressChange(value.formattedAddress);
      onPlaceIdChange(value.placeId);
    },
    [onCoordsChange, onFormattedAddressChange, onPlaceIdChange, onVenueNameChange],
  );

  return (
    <View>
      <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-2">
        Location
      </Text>

      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 flex-row items-center justify-between gap-2 mb-3"
      >
        <Text
          className={[
            'font-grotesk text-base flex-1',
            coords !== null ? 'text-neutral' : 'text-neutral/40',
          ].join(' ')}
          numberOfLines={2}
        >
          {summaryLabel}
        </Text>
        <Ionicons name="map-outline" size={18} color="rgba(228,228,228,0.38)" />
      </Pressable>

      <TextInput
        value={venueName}
        onChangeText={onVenueNameChange}
        placeholder="Club Norte · Court 3"
        placeholderTextColor={PLACEHOLDER_COLOR}
        className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
      />

      <PlacePicker
        visible={pickerOpen}
        initialValue={pickerOpen ? pickerSeed : null}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}
