import { Ionicons } from '@expo/vector-icons';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { Pressable, View, Text, TextInput } from '@/tw';
import type { Database } from '@/types/database';
import {
  COURT_SURFACE_OPTIONS,
  type CourtSurface,
} from '@/lib/padel-court';
import { SectionLabel } from './section-label';
import { SegmentedControl } from './segmented-control';
import { POSITION_OPTIONS } from '../use-create-match-form';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental !== undefined) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MatchDifficulty = Database['public']['Enums']['match_difficulty'];
type MatchGenderPreference = Database['public']['Enums']['match_gender_preference'];

const PLACEHOLDER = 'rgba(228,228,228,0.20)';

type AdvancedSettingsPanelProps = {
  expanded: boolean;
  onToggle: () => void;
  courtSurface: CourtSurface | null;
  onCourtSurfaceChange: (value: CourtSurface | null) => void;
  pricePerPlayer: string;
  onPricePerPlayerChange: (value: string) => void;
  positionsSought: string[];
  onTogglePosition: (value: string) => void;
  genderPreference: MatchGenderPreference | null;
  onGenderPreferenceChange: (value: MatchGenderPreference | null) => void;
  ageMin: string;
  ageMax: string;
  onAgeMinChange: (value: string) => void;
  onAgeMaxChange: (value: string) => void;
  difficulty: MatchDifficulty | null;
  onDifficultyChange: (value: MatchDifficulty | null) => void;
  notes: string;
  onNotesChange: (value: string) => void;
};

const GENDER_OPTIONS: { value: MatchGenderPreference; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
];

const DIFFICULTY_OPTIONS: { value: MatchDifficulty; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'competitive', label: 'Competitive' },
];

export function AdvancedSettingsPanel({
  expanded,
  onToggle,
  courtSurface,
  onCourtSurfaceChange,
  pricePerPlayer,
  onPricePerPlayerChange,
  positionsSought,
  onTogglePosition,
  genderPreference,
  onGenderPreferenceChange,
  ageMin,
  ageMax,
  onAgeMinChange,
  onAgeMaxChange,
  difficulty,
  onDifficultyChange,
  notes,
  onNotesChange,
}: AdvancedSettingsPanelProps) {
  function handleToggle(): void {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }

  return (
    <View>
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
            Price, positions, gender, age, notes
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="rgba(228,228,228,0.38)"
        />
      </Pressable>

      {expanded ? (
        <View className="mt-3 gap-5 px-1">
          <View>
            <SectionLabel>Court surface</SectionLabel>
            <SegmentedControl
              options={[
                { value: 'none' as const, label: 'Any' },
                ...COURT_SURFACE_OPTIONS,
              ]}
              value={courtSurface ?? 'none'}
              onChange={(value) =>
                onCourtSurfaceChange(value === 'none' ? null : value)
              }
            />
          </View>

          <View>
            <SectionLabel>Price per person</SectionLabel>
            <TextInput
              value={pricePerPlayer}
              onChangeText={onPricePerPlayerChange}
              keyboardType="decimal-pad"
              placeholder="Optional"
              placeholderTextColor={PLACEHOLDER}
              className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
            />
          </View>

          <View>
            <SectionLabel>Positions sought</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {POSITION_OPTIONS.map((option) => {
                const selected = positionsSought.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onTogglePosition(option.value)}
                    className={[
                      'rounded-lg px-4 py-2 border',
                      selected ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10',
                    ].join(' ')}
                  >
                    <Text className="font-grotesk text-sm text-neutral">{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <SectionLabel>Gender</SectionLabel>
            <SegmentedControl
              options={[
                { value: 'none' as const, label: 'Any' },
                ...GENDER_OPTIONS,
              ]}
              value={genderPreference ?? 'none'}
              onChange={(value) =>
                onGenderPreferenceChange(value === 'none' ? null : value)
              }
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
            <SectionLabel>Difficulty</SectionLabel>
            <SegmentedControl
              options={[
                { value: 'none' as const, label: 'Any' },
                ...DIFFICULTY_OPTIONS,
              ]}
              value={difficulty ?? 'none'}
              onChange={(value) => onDifficultyChange(value === 'none' ? null : value)}
            />
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
        </View>
      ) : null}
    </View>
  );
}
