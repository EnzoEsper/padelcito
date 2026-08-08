import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text } from '@/tw';
import {
  countActiveDiscoverFilters,
  DEFAULT_DISCOVER_FILTERS,
  GENDER_OPTIONS,
  genderFilterLabel,
  LEVEL_OPTIONS,
  levelFilterLabel,
  SORT_OPTIONS,
  sortFilterLabel,
  WHEN_OPTIONS,
  whenFilterLabel,
  type DiscoverFilters,
  type FilterOption,
} from '@/features/discover/discover-filters';

type FilterGroupId = 'when' | 'level' | 'gender' | 'sort';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface3: '#232429',
  blue: '#2B396D',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  label: 'rgba(228,228,228,0.72)',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

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

function AllFiltersSheet({
  visible,
  filters,
  resultCount,
  onChange,
  onReset,
  onClose,
}: {
  visible: boolean;
  filters: DiscoverFilters;
  resultCount: number;
  onChange: (next: DiscoverFilters) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const hasActiveFilters = countActiveDiscoverFilters(filters) > 0;

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Filters" showClose maxHeight="72%">
      <View style={styles.allFiltersHeader}>
        <Text style={styles.resultCountText}>
          {resultCount} {resultCount === 1 ? 'match' : 'matches'}
        </Text>
        {hasActiveFilters ? (
          <Pressable onPress={onReset} accessibilityRole="button" accessibilityLabel="Reset filters">
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
        <Text style={styles.sheetSectionLabel}>When</Text>
        {WHEN_OPTIONS.map((option) => {
          const selected = filters.when === option.value;
          return (
            <Pressable
              key={`all-when-${option.value}`}
              onPress={() => onChange({ ...filters, when: option.value })}
              style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
            >
              <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={C.mist} /> : null}
            </Pressable>
          );
        })}

        <Text style={[styles.sheetSectionLabel, styles.sheetSectionLabelSpaced]}>Level</Text>
        {LEVEL_OPTIONS.map((option) => {
          const selected = filters.level === option.value;
          return (
            <Pressable
              key={`all-level-${option.value}`}
              onPress={() => onChange({ ...filters, level: option.value })}
              style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
            >
              <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={C.mist} /> : null}
            </Pressable>
          );
        })}

        <Text style={[styles.sheetSectionLabel, styles.sheetSectionLabelSpaced]}>Gender</Text>
        {GENDER_OPTIONS.map((option) => {
          const selected = filters.gender === option.value;
          return (
            <Pressable
              key={`all-gender-${option.value}`}
              onPress={() => onChange({ ...filters, gender: option.value })}
              style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
            >
              <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                {option.label}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={C.mist} /> : null}
            </Pressable>
          );
        })}

        <Text style={[styles.sheetSectionLabel, styles.sheetSectionLabelSpaced]}>Availability</Text>
        <Pressable
          onPress={() => onChange({ ...filters, openSpotsOnly: !filters.openSpotsOnly })}
          style={[styles.sheetOption, filters.openSpotsOnly && styles.sheetOptionSelected]}
        >
          <Text
            style={[
              styles.sheetOptionText,
              filters.openSpotsOnly && styles.sheetOptionTextSelected,
            ]}
          >
            Has open spots
          </Text>
          {filters.openSpotsOnly ? <Ionicons name="checkmark" size={18} color={C.mist} /> : null}
        </Pressable>

        <Text style={[styles.sheetSectionLabel, styles.sheetSectionLabelSpaced]}>Sort by</Text>
        {SORT_OPTIONS.map((option) => {
          const selected = filters.sort === option.value;
          return (
            <Pressable
              key={`all-sort-${option.value}`}
              onPress={() => onChange({ ...filters, sort: option.value })}
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

export function DiscoverFilterBar({
  filters,
  onChange,
  resultCount,
}: {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
  resultCount: number;
}) {
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<FilterGroupId | null>(null);

  const activeFilterCount = countActiveDiscoverFilters(filters);
  const hasActiveFilters = activeFilterCount > 0;
  const whenActive = filters.when !== DEFAULT_DISCOVER_FILTERS.when;
  const levelActive = filters.level !== DEFAULT_DISCOVER_FILTERS.level;
  const genderActive = filters.gender !== DEFAULT_DISCOVER_FILTERS.gender;
  const sortActive = filters.sort !== DEFAULT_DISCOVER_FILTERS.sort;

  function openGroupSheet(groupId: FilterGroupId): void {
    setOpenGroup(groupId);
  }

  function handleReset(): void {
    onChange(DEFAULT_DISCOVER_FILTERS);
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.chipRow}
      >
        <View style={styles.filterIconWrap}>
          <Pressable
            onPress={() => setAllFiltersOpen(true)}
            style={[styles.filterIconChip, hasActiveFilters && styles.filterIconChipActive]}
            accessibilityRole="button"
            accessibilityLabel="All filters"
            accessibilityHint="Opens filter options"
          >
            <Ionicons name="options-outline" size={17} color={hasActiveFilters ? C.mist : C.dim} />
          </Pressable>
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge} accessibilityLabel={`${activeFilterCount} active filters`}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </View>

        <FilterChip
          label={whenFilterLabel(filters.when)}
          active={whenActive}
          onPress={() => openGroupSheet('when')}
          accessibilityLabel={`When: ${whenFilterLabel(filters.when)}`}
        />

        <FilterChip
          label={levelFilterLabel(filters.level)}
          active={levelActive}
          onPress={() => openGroupSheet('level')}
          accessibilityLabel={`Level: ${levelFilterLabel(filters.level)}`}
        />

        <FilterChip
          label={genderFilterLabel(filters.gender)}
          active={genderActive}
          onPress={() => openGroupSheet('gender')}
          accessibilityLabel={`Gender: ${genderFilterLabel(filters.gender)}`}
        />

        {filters.openSpotsOnly ? (
          <FilterChip
            label="Open spots"
            active
            onPress={() => onChange({ ...filters, openSpotsOnly: false })}
            accessibilityLabel="Open spots: active. Tap to remove."
          />
        ) : null}

        <View style={styles.filterDivider} accessibilityElementsHidden importantForAccessibility="no" />

        <FilterChip
          label={`Sort: ${sortFilterLabel(filters.sort)}`}
          active={sortActive}
          onPress={() => openGroupSheet('sort')}
          accessibilityLabel={`Sort: ${sortFilterLabel(filters.sort)}`}
        />
      </ScrollView>

      <AllFiltersSheet
        visible={allFiltersOpen}
        filters={filters}
        resultCount={resultCount}
        onChange={onChange}
        onReset={handleReset}
        onClose={() => setAllFiltersOpen(false)}
      />

      <FilterOptionSheet
        visible={openGroup === 'when'}
        title="When"
        value={filters.when}
        options={WHEN_OPTIONS}
        onChange={(when) => onChange({ ...filters, when })}
        onClose={() => setOpenGroup(null)}
      />

      <FilterOptionSheet
        visible={openGroup === 'level'}
        title="Level"
        value={filters.level}
        options={LEVEL_OPTIONS}
        onChange={(level) => onChange({ ...filters, level })}
        onClose={() => setOpenGroup(null)}
      />

      <FilterOptionSheet
        visible={openGroup === 'gender'}
        title="Gender"
        value={filters.gender}
        options={GENDER_OPTIONS}
        onChange={(gender) => onChange({ ...filters, gender })}
        onClose={() => setOpenGroup(null)}
      />

      <FilterOptionSheet
        visible={openGroup === 'sort'}
        title="Sort by"
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(sort) => onChange({ ...filters, sort })}
        onClose={() => setOpenGroup(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    marginBottom: 22,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 8,
    alignItems: 'center',
  },
  filterIconWrap: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
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
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.blueHi,
    borderWidth: 2,
    borderColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9,
    color: C.mist,
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
  allFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultCountText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.mist,
  },
  resetText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.blueHi,
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
    backgroundColor: C.surface3,
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
