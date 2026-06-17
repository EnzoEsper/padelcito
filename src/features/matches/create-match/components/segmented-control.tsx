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

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row gap-1 bg-surface-3 rounded-xl p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={[
              'flex-1 rounded-lg py-2.5 items-center justify-center',
              selected ? 'bg-primary' : 'bg-transparent',
            ].join(' ')}
          >
            <Text
              className={[
                'font-grotesk text-sm font-semibold',
                selected ? 'text-neutral' : 'text-neutral/60',
              ].join(' ')}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
