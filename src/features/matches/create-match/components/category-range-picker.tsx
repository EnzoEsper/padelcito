import { Pressable, View, Text } from '@/tw';
import { PADEL_CATEGORIES, formatCategoryRangeLabel } from '@/lib/padel-category';

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
    if (number === categoryMax && number === categoryMin) {
      return;
    }

    if (number < categoryMax) {
      onChange(number, categoryMin);
      return;
    }

    if (number > categoryMin) {
      onChange(categoryMax, number);
      return;
    }

    if (number >= categoryMax && number <= categoryMin) {
      const distToMax = number - categoryMax;
      const distToMin = categoryMin - number;
      if (distToMax <= distToMin) {
        onChange(number, categoryMin);
      } else {
        onChange(categoryMax, number);
      }
      return;
    }

    onChange(number, number);
  }

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {PADEL_CATEGORIES.map(({ number, label }) => {
          const inRange = number >= categoryMax && number <= categoryMin;
          return (
            <Pressable
              key={number}
              onPress={() => handlePress(number)}
              className={[
                'w-10 h-10 rounded-full items-center justify-center border',
                inRange
                  ? 'bg-neutral border-neutral'
                  : 'bg-surface-3 border-neutral/10',
              ].join(' ')}
            >
              <Text
                className={[
                  'font-mono text-sm font-bold',
                  inRange ? 'text-background' : 'text-neutral/60',
                ].join(' ')}
              >
                {label.replace('ª', '')}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="font-grotesk text-xs text-neutral/60 mt-3">
        {formatCategoryRangeLabel(categoryMax, categoryMin)}
      </Text>
    </View>
  );
}
