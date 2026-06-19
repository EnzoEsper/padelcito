import { StyleSheet } from 'react-native';
import { Pressable, View, Text } from '@/tw';

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Same shell as category range bar (rounded-xl, px-3, py-2.5). */
const CAPSULE_CLASS =
  'rounded-xl bg-surface-1 border border-neutral/10 px-3 py-2.5 flex-row items-center gap-1';

/** h-9 — matches category inner cell height. */
const SEGMENT_HEIGHT = 36;
/** --radius-lg: nested one step inside capsule --radius-xl, same as category selected cells. */
const SEGMENT_RADIUS = 16;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className={CAPSULE_CLASS}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-1 min-w-0"
          >
            <View
              style={[styles.segment, selected ? styles.segmentSelected : styles.segmentIdle]}
              className="w-full items-center justify-center px-2"
            >
              <Text
                className={[
                  'font-grotesk text-sm font-semibold',
                  selected ? 'text-neutral' : 'text-neutral/55',
                ].join(' ')}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    height: SEGMENT_HEIGHT,
    borderRadius: SEGMENT_RADIUS,
    overflow: 'hidden',
  },
  segmentSelected: {
    backgroundColor: '#2B396D',
  },
  segmentIdle: {
    backgroundColor: 'transparent',
  },
});
