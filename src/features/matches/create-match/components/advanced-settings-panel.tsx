import { Ionicons } from '@expo/vector-icons';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { Pressable, View, Text, TextInput } from '@/tw';
import type { CourtConfig } from '@/lib/padel-court';
import { POSITION_PREFERENCE_OPTIONS, type PositionPreference } from '@/lib/padel-position';
import { SectionLabel } from './section-label';
import { SegmentedControl } from './segmented-control';
import { CurrencyInput } from './currency-input';
import { CourtsConfigSection } from './courts-config-section';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental !== undefined) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PLACEHOLDER = 'rgba(228,228,228,0.20)';

type AdvancedSettingsPanelProps = {
  expanded: boolean;
  onToggle: () => void;
  courtCount: number;
  courtConfigs: CourtConfig[];
  onUpdateCourt: (index: number, patch: Partial<CourtConfig>) => void;
  pricePerPlayer: string;
  onPricePerPlayerChange: (value: string) => void;
  positionPreference: PositionPreference;
  onPositionPreferenceChange: (value: PositionPreference) => void;
  ageMin: string;
  ageMax: string;
  onAgeMinChange: (value: string) => void;
  onAgeMaxChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
};

export function AdvancedSettingsPanel({
  expanded,
  onToggle,
  courtCount,
  courtConfigs,
  onUpdateCourt,
  pricePerPlayer,
  onPricePerPlayerChange,
  positionPreference,
  onPositionPreferenceChange,
  ageMin,
  ageMax,
  onAgeMinChange,
  onAgeMaxChange,
  notes,
  onNotesChange,
}: AdvancedSettingsPanelProps) {
  function handleToggle(): void {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }

  return (
    <View>
      <SectionLabel>More options</SectionLabel>
      <Pressable
        onPress={handleToggle}
        className="rounded-xl bg-surface-1 border border-neutral/10 px-4 py-4 flex-row items-center gap-3"
      >
        <View className="w-10 h-10 rounded-xl bg-surface-3 items-center justify-center">
          <Ionicons name="options-outline" size={20} color="rgba(228,228,228,0.60)" />
        </View>
        <View className="flex-1">
          <Text className="font-grotesk text-base font-semibold text-neutral">Advanced settings</Text>
          <Text className="font-grotesk text-xs text-neutral/60 mt-0.5">
            Price, positions, age, notes, court setup
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="rgba(228,228,228,0.38)"
        />
      </Pressable>

      {expanded ? (
        <View className="mt-3 gap-5">
          <View>
            <SectionLabel>Price per person</SectionLabel>
            <CurrencyInput value={pricePerPlayer} onChangeText={onPricePerPlayerChange} />
          </View>

          <View>
            <SectionLabel>Positions sought</SectionLabel>
            <SegmentedControl
              options={POSITION_PREFERENCE_OPTIONS}
              value={positionPreference}
              onChange={onPositionPreferenceChange}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <SectionLabel>Min age</SectionLabel>
              <TextInput
                value={ageMin}
                onChangeText={onAgeMinChange}
                keyboardType="number-pad"
                placeholder="Optional"
                placeholderTextColor={PLACEHOLDER}
                className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-mono text-sm text-neutral"
              />
            </View>
            <View className="flex-1">
              <SectionLabel>Max age</SectionLabel>
              <TextInput
                value={ageMax}
                onChangeText={onAgeMaxChange}
                keyboardType="number-pad"
                placeholder="Optional"
                placeholderTextColor={PLACEHOLDER}
                className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-mono text-sm text-neutral"
              />
            </View>
          </View>

          <View>
            <SectionLabel>Notes</SectionLabel>
            <TextInput
              value={notes}
              onChangeText={onNotesChange}
              multiline
              maxLength={500}
              textAlignVertical="top"
              placeholder="Anything players should know…"
              placeholderTextColor={PLACEHOLDER}
              className="min-h-24 rounded-xl bg-surface-1 border border-neutral/10 px-4 py-3 font-grotesk text-base text-neutral"
            />
          </View>

          <CourtsConfigSection
            courtCount={courtCount}
            courtConfigs={courtConfigs}
            onUpdateCourt={onUpdateCourt}
          />
        </View>
      ) : null}
    </View>
  );
}
