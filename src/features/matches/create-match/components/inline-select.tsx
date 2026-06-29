import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, Text } from '@/tw';

export type InlineSelectOption<T extends string> = {
  value: T;
  label: string;
};

type InlineSelectProps<T extends string> = {
  sheetTitle: string;
  value: T;
  options: readonly InlineSelectOption<T>[];
  onChange: (value: T) => void;
  embedded?: boolean;
  showDivider?: boolean;
  flexClass?: string;
};

export function InlineSelect<T extends string>({
  sheetTitle,
  value,
  options,
  onChange,
  embedded = false,
  showDivider = false,
  flexClass = 'flex-1',
}: InlineSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  function handleSelect(next: T): void {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={[
          flexClass,
          embedded
            ? 'min-h-14 px-3 flex-row items-center justify-between gap-1'
            : 'h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 flex-row items-center justify-between gap-1',
          showDivider ? 'border-r border-neutral/10' : '',
        ].join(' ')}
      >
        <Text className="font-grotesk text-sm text-neutral" numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color="rgba(228,228,228,0.38)" />
      </Pressable>

      <AppBottomSheet visible={open} onClose={() => setOpen(false)} title={sheetTitle}>
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                className={[
                  'h-12 rounded-xl px-4 flex-row items-center justify-between mb-1.5',
                  selected ? 'bg-primary' : 'bg-surface-3',
                ].join(' ')}
              >
                <Text
                  className={[
                    'font-grotesk text-base',
                    selected ? 'text-neutral font-semibold' : 'text-neutral/75',
                  ].join(' ')}
                >
                  {option.label}
                </Text>
                {selected ? <Ionicons name="checkmark" size={18} color="#E4E4E4" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </AppBottomSheet>
    </>
  );
}
