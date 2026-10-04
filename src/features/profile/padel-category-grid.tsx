import { StyleSheet } from 'react-native';
import { Pressable, Text, View } from '@/tw';
import {
  formatCategoryLabel,
  PADEL_CATEGORY_GROUPS,
  type PadelCategoryNumber,
} from '@/lib/padel-category';

const BORDER_DEFAULT = 'rgba(228,228,228,0.10)';
const BORDER_SELECTED = 'rgba(94,112,184,0.85)';
const BG_SELECTED = 'rgba(94,112,184,0.22)';

type PadelCategoryGridProps = {
  selected: PadelCategoryNumber | null;
  onSelect: (category: PadelCategoryNumber) => void;
  isInRange?: (category: PadelCategoryNumber) => boolean;
};

export function PadelCategoryGrid({
  selected,
  onSelect,
  isInRange,
}: PadelCategoryGridProps) {
  return (
    <View style={styles.root}>
      {PADEL_CATEGORY_GROUPS.map((group) => (
        <View key={group.tier} style={styles.groupBlock}>
          <Text style={styles.tierLabel}>{group.label}</Text>
          <View style={styles.row}>
            {group.numbers.map((number) => {
              const inRange = isInRange?.(number) ?? false;
              const isActive = selected === number || inRange;
              return (
                <Pressable
                  key={number}
                  onPress={() => onSelect(number)}
                  style={[
                    styles.cell,
                    isActive
                      ? { borderColor: BORDER_SELECTED, backgroundColor: BG_SELECTED }
                      : { borderColor: BORDER_DEFAULT, backgroundColor: '#1A1B1F' },
                  ]}
                  android_ripple={{ color: 'rgba(94,112,184,0.25)' }}
                >
                  <Text
                    className={[
                      'font-mono text-[14px] font-bold',
                      isActive ? 'text-neutral' : 'text-neutral/50',
                    ].join(' ')}
                  >
                    {formatCategoryLabel(number)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  groupBlock: {
    gap: 0,
  },
  tierLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(228,228,228,0.45)',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
