import { TextInput, View, Text } from '@/tw';
import { applyArsAmountInputChange } from '@/lib/currency-ars';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type CurrencyInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function CurrencyInput({ value, onChangeText, placeholder = 'Optional' }: CurrencyInputProps) {
  function handleChangeText(text: string): void {
    onChangeText(applyArsAmountInputChange(text));
  }

  return (
    <View className="h-14 rounded-xl bg-surface-1 border border-neutral/10 flex-row items-center px-4">
      <Text className="font-mono text-base text-neutral/50 mr-2">$</Text>
      <TextInput
        value={value}
        onChangeText={handleChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER_COLOR}
        className="flex-1 font-mono text-base text-neutral py-0"
      />
    </View>
  );
}
