import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';

type StepperFieldProps = {
  label: string;
  sublabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
};

export function StepperField({
  label,
  sublabel,
  icon,
  value,
  onDecrement,
  onIncrement,
  decrementDisabled = false,
  incrementDisabled = false,
}: StepperFieldProps) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center gap-3 flex-1 pr-3">
        {icon !== undefined ? (
          <View className="w-9 h-9 rounded-full bg-surface-3 items-center justify-center">
            <Ionicons name={icon} size={18} color="rgba(228,228,228,0.60)" />
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="font-grotesk text-base text-neutral">{label}</Text>
          {sublabel !== undefined ? (
            <Text className="font-grotesk text-xs text-neutral/60 mt-0.5">{sublabel}</Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onDecrement}
          disabled={decrementDisabled}
          className={[
            'w-9 h-9 rounded-full bg-surface-3 items-center justify-center border border-neutral/10',
            decrementDisabled ? 'opacity-40' : '',
          ].join(' ')}
        >
          <Ionicons name="remove" size={18} color="#E4E4E4" />
        </Pressable>
        <Text className="font-mono text-base font-bold text-neutral min-w-[28px] text-center">
          {value}
        </Text>
        <Pressable
          onPress={onIncrement}
          disabled={incrementDisabled}
          className={[
            'w-9 h-9 rounded-full bg-surface-3 items-center justify-center border border-neutral/10',
            incrementDisabled ? 'opacity-40' : '',
          ].join(' ')}
        >
          <Ionicons name="add" size={18} color="#E4E4E4" />
        </Pressable>
      </View>
    </View>
  );
}
