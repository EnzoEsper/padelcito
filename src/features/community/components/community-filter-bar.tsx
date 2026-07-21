import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text } from '@/tw';
import type { Database } from '@/types/database';

type CommunityPostType = Database['public']['Enums']['community_post_type'];
export type CommunityFeedMode = 'nearby' | 'all';
export type CommunityTypeFilter = CommunityPostType | 'all';

type FilterOption<T extends string> = {
  value: T;
  label: string;
};

type FilterGroupId = 'scope' | 'type';

const C = {
  surface1: '#141417',
  blue: '#2B396D',
  mist: '#E4E4E4',
  label: 'rgba(228,228,228,0.72)',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

const FEED_MODE_OPTIONS: FilterOption<CommunityFeedMode>[] = [
  { value: 'nearby', label: 'Nearby' },
  { value: 'all', label: 'All events' },
];

const TYPE_FILTER_OPTIONS: FilterOption<CommunityTypeFilter>[] = [
  { value: 'all', label: 'All types' },
  { value: 'tournament', label: 'Tournaments' },
  { value: 'training', label: 'Training' },
];

/** Inline chips shown before opening a group sheet when options exceed this count. */
const MAX_INLINE_OPTIONS = 4;

function FilterOptionSheet<T extends string>({
  visible,
  title,
  value,
  options,
  onChange,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: T;
  options: readonly FilterOption<T>[];
  onChange: (value: T) => void;
  onClose: () => void;
}) {
  function handleSelect(next: T): void {
    onChange(next);
    onClose();
  }

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title={title} showClose>
      <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
            >
              <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={C.mist} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </AppBottomSheet>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FilterGroupChips<T extends string>({
  groupId,
  sheetTitle,
  options,
  value,
  onChange,
  onOpenSheet,
  optionPrefix,
}: {
  groupId: FilterGroupId;
  sheetTitle: string;
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  onOpenSheet: (groupId: FilterGroupId) => void;
  optionPrefix: string;
}) {
  const useOverflowSheet = options.length > MAX_INLINE_OPTIONS;
  const inlineOptions = useOverflowSheet
    ? options.filter((option) => option.value === value)
    : options;

  return (
    <>
      {inlineOptions.map((option) => {
        const active = value === option.value;
        return (
          <FilterChip
            key={`${groupId}-${option.value}`}
            label={option.label}
            active={active}
            onPress={() => onChange(option.value)}
            accessibilityLabel={`${optionPrefix}: ${option.label}`}
          />
        );
      })}

      {useOverflowSheet ? (
        <Pressable
          onPress={() => onOpenSheet(groupId)}
          style={[styles.chip, styles.moreChip]}
          accessibilityRole="button"
          accessibilityLabel={`${optionPrefix}: more options`}
          accessibilityHint={`Opens ${sheetTitle.toLowerCase()} options`}
        >
          <Text style={styles.chipText}>More</Text>
          <Ionicons name="chevron-down" size={13} color={C.faint} />
        </Pressable>
      ) : null}
    </>
  );
}

function AllFiltersSheet({
  visible,
  feedMode,
  typeFilter,
  onFeedModeChange,
  onTypeFilterChange,
  onClose,
}: {
  visible: boolean;
  feedMode: CommunityFeedMode;
  typeFilter: CommunityTypeFilter;
  onFeedModeChange: (value: CommunityFeedMode) => void;
  onTypeFilterChange: (value: CommunityTypeFilter) => void;
  onClose: () => void;
}) {
  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Filters" showClose maxHeight="62%">
      <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
        <Text style={styles.sheetSectionLabel}>Scope</Text>
        {FEED_MODE_OPTIONS.map((option) => {
          const selected = feedMode === option.value;
          return (
            <Pressable
              key={`all-scope-${option.value}`}
              onPress={() => onFeedModeChange(option.value)}
              style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
            >
              <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={C.mist} /> : null}
            </Pressable>
          );
        })}

        <Text style={[styles.sheetSectionLabel, styles.sheetSectionLabelSpaced]}>Event type</Text>
        {TYPE_FILTER_OPTIONS.map((option) => {
          const selected = typeFilter === option.value;
          return (
            <Pressable
              key={`all-type-${option.value}`}
              onPress={() => onTypeFilterChange(option.value)}
              style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
            >
              <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={C.mist} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </AppBottomSheet>
  );
}

export function CommunityFilterBar({
  feedMode,
  typeFilter,
  onFeedModeChange,
  onTypeFilterChange,
}: {
  feedMode: CommunityFeedMode;
  typeFilter: CommunityTypeFilter;
  onFeedModeChange: (value: CommunityFeedMode) => void;
  onTypeFilterChange: (value: CommunityTypeFilter) => void;
}) {
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<FilterGroupId | null>(null);

  const hasActiveFilters = feedMode !== 'nearby' || typeFilter !== 'all';

  function openGroupSheet(groupId: FilterGroupId): void {
    setOpenGroup(groupId);
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          onPress={() => setAllFiltersOpen(true)}
          style={[styles.filterIconChip, hasActiveFilters && styles.filterIconChipActive]}
          accessibilityRole="button"
          accessibilityLabel="All filters"
          accessibilityHint="Opens filter options"
        >
          <Ionicons name="options-outline" size={17} color={hasActiveFilters ? C.mist : C.dim} />
        </Pressable>

        <FilterGroupChips
          groupId="scope"
          sheetTitle="Scope"
          options={FEED_MODE_OPTIONS}
          value={feedMode}
          onChange={onFeedModeChange}
          onOpenSheet={openGroupSheet}
          optionPrefix="Scope"
        />

        <View style={styles.filterDivider} accessibilityElementsHidden importantForAccessibility="no" />

        <FilterGroupChips
          groupId="type"
          sheetTitle="Event type"
          options={TYPE_FILTER_OPTIONS}
          value={typeFilter}
          onChange={onTypeFilterChange}
          onOpenSheet={openGroupSheet}
          optionPrefix="Type"
        />
      </ScrollView>

      <AllFiltersSheet
        visible={allFiltersOpen}
        feedMode={feedMode}
        typeFilter={typeFilter}
        onFeedModeChange={onFeedModeChange}
        onTypeFilterChange={onTypeFilterChange}
        onClose={() => setAllFiltersOpen(false)}
      />

      <FilterOptionSheet
        visible={openGroup === 'scope'}
        title="Scope"
        value={feedMode}
        options={FEED_MODE_OPTIONS}
        onChange={onFeedModeChange}
        onClose={() => setOpenGroup(null)}
      />

      <FilterOptionSheet
        visible={openGroup === 'type'}
        title="Event type"
        value={typeFilter}
        options={TYPE_FILTER_OPTIONS}
        onChange={onTypeFilterChange}
        onClose={() => setOpenGroup(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    marginBottom: 16,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
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
  filterIconChipActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  filterDivider: {
    width: 1,
    height: 22,
    backgroundColor: C.hair,
    marginHorizontal: 2,
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
  moreChip: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
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
  sheetList: {
    flexGrow: 0,
  },
  sheetSectionLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.label,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sheetSectionLabelSpaced: {
    marginTop: 16,
  },
  sheetOption: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#232429',
    paddingHorizontal: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetOptionSelected: {
    backgroundColor: C.blue,
  },
  sheetOptionText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    color: 'rgba(228,228,228,0.75)',
  },
  sheetOptionTextSelected: {
    fontFamily: 'HankenGrotesk-Bold',
    color: C.mist,
  },
});
