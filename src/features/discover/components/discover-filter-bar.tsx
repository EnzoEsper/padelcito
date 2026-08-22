import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FilterSheetModal } from '@/components/filter-sheet-modal';
import {
  FilterSheetChipSection,
  FilterSheetFooter,
} from '@/components/filter-sheet-ui';
import { OptionSelectSheet } from '@/components/option-select';
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
  blue: '#2B396D',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
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
    <OptionSelectSheet
      visible={visible}
      onClose={onClose}
      title={title}
      options={options}
      value={value}
      onSelect={handleSelect}
    />
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
  const resultLabel = `${resultCount} ${resultCount === 1 ? 'match' : 'matches'} found`;
  const primaryLabel = `Show ${resultCount} ${resultCount === 1 ? 'match' : 'matches'}`;

  return (
    <FilterSheetModal
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <FilterSheetFooter
          resultLabel={resultLabel}
          primaryLabel={primaryLabel}
          onPrimary={onClose}
          clearLabel="Clear all"
          onClear={onReset}
          showClear={hasActiveFilters}
        />
      }
    >
      <FilterSheetChipSection
        label="When"
        options={WHEN_OPTIONS}
        value={filters.when}
        onChange={(when) => onChange({ ...filters, when })}
      />

      <FilterSheetChipSection
        label="Level"
        options={LEVEL_OPTIONS}
        value={filters.level}
        onChange={(level) => onChange({ ...filters, level })}
        spaced
      />

      <FilterSheetChipSection
        label="Gender"
        options={GENDER_OPTIONS}
        value={filters.gender}
        onChange={(gender) => onChange({ ...filters, gender })}
        spaced
      />

      <FilterSheetChipSection
        label="Sort by"
        options={SORT_OPTIONS}
        value={filters.sort}
        onChange={(sort) => onChange({ ...filters, sort })}
        spaced
      />
    </FilterSheetModal>
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
        nestedScrollEnabled
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
    flexGrow: 0,
    flexShrink: 0,
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
});
