import { StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/tw';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface2: '#1B1C21',
  blue: '#2B396D',
  blueHi: '#7488D8',
  blueBorder: '#5E70B8',
  mist: '#E4E4E4',
  label: 'rgba(228,228,228,0.72)',
  dim: 'rgba(228,228,228,0.60)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

type ChipOption<T extends string> = {
  value: T;
  label: string;
};

/** Section with chip grid — matches Discover/Community filter bar visual language. */
export function FilterSheetChipSection<T extends string>({
  label,
  options,
  value,
  onChange,
  spaced = false,
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  spaced?: boolean;
}) {
  return (
    <View style={[styles.section, spaced ? styles.sectionSpaced : null]}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <FilterSheetChip
              key={option.value}
              label={option.label}
              selected={selected}
              onPress={() => onChange(option.value)}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Single toggle chip (e.g. "Open spots only"). */
export function FilterSheetToggleChip({
  label,
  selected,
  onPress,
  spaced = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  spaced?: boolean;
}) {
  return (
    <View style={[styles.section, spaced ? styles.sectionSpaced : null]}>
      <FilterSheetChip label={label} selected={selected} onPress={onPress} />
    </View>
  );
}

export function FilterSheetChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Chip grid for compact single-group sheets (When, Level, etc.). */
export function FilterSheetChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((option) => (
        <FilterSheetChip
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

/** Airbnb-style footer: primary CTA closes sheet; optional clear action. */
export function FilterSheetFooter({
  resultLabel,
  primaryLabel,
  onPrimary,
  clearLabel,
  onClear,
  showClear,
}: {
  resultLabel: string;
  primaryLabel: string;
  onPrimary: () => void;
  clearLabel?: string;
  onClear?: () => void;
  showClear?: boolean;
}) {
  return (
    <View style={styles.footerStack}>
      <Text style={styles.footerSummary}>{resultLabel}</Text>
      <Pressable
        onPress={onPrimary}
        style={styles.primaryButton}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
      </Pressable>
      {showClear && onClear !== undefined && clearLabel !== undefined ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
        >
          <Text style={styles.clearButtonText}>{clearLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  sectionSpaced: {
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.label,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 39,
    borderRadius: 11,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 15,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: C.blue,
    borderColor: C.blueBorder,
  },
  chipText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
    lineHeight: 18,
    color: C.dim,
  },
  chipTextSelected: {
    color: C.mist,
  },
  footerStack: {
    gap: 10,
  },
  footerSummary: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    color: C.dim,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: C.blue,
    borderWidth: 1,
    borderColor: C.blueBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.mist,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  clearButtonText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.blueHi,
  },
});
