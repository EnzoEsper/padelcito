import { Pressable, View, Text } from '@/tw';
import {
  PADEL_CATEGORIES,
  computeNextCategoryRange,
  formatCategoryRangeLabel,
} from '@/lib/padel-category';

type CategoryRangePickerProps = {
  categoryMax: number;
  categoryMin: number;
  onChange: (categoryMax: number, categoryMin: number) => void;
};

export function CategoryRangePicker({
  categoryMax,
  categoryMin,
  onChange,
}: CategoryRangePickerProps) {
  function handlePress(number: number): void {
    const next = computeNextCategoryRange(categoryMax, categoryMin, number);
    onChange(next.categoryMax, next.categoryMin);
  }

  return (
    <View>
      <View className="rounded-xl bg-surface-1 border border-neutral/10 px-3 py-2.5 flex-row items-center">
        {PADEL_CATEGORIES.map(({ number }) => {
          const inRange = number >= categoryMax && number <= categoryMin;
          return (
            <Pressable
              key={number}
              onPress={() => handlePress(number)}
              className="flex-1 items-center justify-center"
            >
              {inRange ? (
                <View className="h-9 w-full max-w-[34px] rounded-lg bg-neutral items-center justify-center">
                  <Text className="font-mono text-sm font-bold text-background">{number}</Text>
                </View>
              ) : (
                <View className="h-9 w-full max-w-[34px] items-center justify-center">
                  <Text className="font-mono text-sm font-bold text-neutral/55">{number}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text className="font-grotesk text-xs text-neutral/60 mt-3 leading-5">
        {formatCategoryRangeLabel(categoryMax, categoryMin)}
      </Text>
      <Text className="font-grotesk text-xs text-neutral/45 mt-1 leading-5">
        Tap a level to select it. Tap another while one is selected to set a range.
      </Text>
    </View>
  );
}
