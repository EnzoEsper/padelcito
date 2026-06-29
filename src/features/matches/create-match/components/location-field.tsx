import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text, TextInput } from '@/tw';
import { type Coords } from '@/lib/location';
import { PRESET_MATCH_LOCATIONS, type PresetLocation } from '../preset-locations';
import { SectionLabel } from './section-label';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

function coordsMatch(a: Coords, b: Coords): boolean {
  return a.lat === b.lat && a.lng === b.lng;
}

function findSelectedPreset(coords: Coords | null): PresetLocation | null {
  if (coords === null) return null;
  return PRESET_MATCH_LOCATIONS.find((preset) => coordsMatch(preset.coords, coords)) ?? null;
}

type LocationFieldProps = {
  venueName: string;
  onVenueNameChange: (value: string) => void;
  coords: Coords | null;
  onCoordsChange: (coords: Coords | null) => void;
  onFormattedAddressChange: (value: string | null) => void;
  onPlaceIdChange: (value: string | null) => void;
};

export function LocationField({
  venueName,
  onVenueNameChange,
  coords,
  onCoordsChange,
  onFormattedAddressChange,
  onPlaceIdChange,
}: LocationFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedPreset = findSelectedPreset(coords);

  const handleSelectPreset = useCallback(
    (preset: PresetLocation): void => {
      onCoordsChange(preset.coords);
      onVenueNameChange(preset.venueName);
      onFormattedAddressChange(preset.formattedAddress);
      onPlaceIdChange(preset.placeId);
      setPickerOpen(false);
    },
    [onCoordsChange, onFormattedAddressChange, onPlaceIdChange, onVenueNameChange],
  );

  return (
    <View>
      <SectionLabel>Location</SectionLabel>

      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 flex-row items-center justify-between gap-2 mb-3"
      >
        <Text
          className={[
            'font-grotesk text-base flex-1',
            selectedPreset !== null ? 'text-neutral' : 'text-neutral/40',
          ].join(' ')}
          numberOfLines={1}
        >
          {selectedPreset?.venueName ?? 'Pick a venue'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="rgba(228,228,228,0.38)" />
      </Pressable>

      <TextInput
        value={venueName}
        onChangeText={onVenueNameChange}
        placeholder="Club Norte · Court 3"
        placeholderTextColor={PLACEHOLDER_COLOR}
        className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
      />

      <AppBottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Venue"
        maxHeight="60%"
      >
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          {PRESET_MATCH_LOCATIONS.map((preset) => {
            const selected = selectedPreset?.id === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() => handleSelectPreset(preset)}
                className={[
                  'rounded-xl px-4 py-3 flex-row items-center gap-3 mb-2',
                  selected ? 'bg-primary' : 'bg-surface-3',
                ].join(' ')}
              >
                <View className="flex-1 min-w-0">
                  <Text
                    className={[
                      'font-grotesk text-base mb-1',
                      selected ? 'text-neutral font-semibold' : 'text-neutral/75',
                    ].join(' ')}
                  >
                    {preset.venueName}
                  </Text>
                  <Text className="font-grotesk text-sm text-neutral/50" numberOfLines={2}>
                    {preset.formattedAddress}
                  </Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={18} color="#E4E4E4" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </AppBottomSheet>
    </View>
  );
}
