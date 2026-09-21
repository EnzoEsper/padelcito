import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useController, type Control, type FieldErrors, type FieldValues, type Path } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from '@/tw';
import { OptionSelectSheet } from '@/components/option-select';
import {
  DOMINANT_HAND_OPTIONS,
  PLAYER_COURT_SIDE_OPTIONS,
  formatDominantHandLabel,
  formatPositionLabel,
  type DominantHand,
  type PositionPreference,
} from '@/lib/padel-position';

const BORDER_DEFAULT = 'rgba(228,228,228,0.10)';
const BORDER_FOCUSED = 'rgba(228,228,228,0.60)';
const BORDER_ERROR = 'rgba(224,177,91,0.60)';
const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
      {children}
    </Text>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <Text className="font-grotesk text-sm text-warning mt-2 leading-5">{message}</Text>
  );
}

type PreferencePickerProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
  formatValue: (value: T) => string;
};

function PreferencePicker<T extends string>({
  label,
  value,
  options,
  onChange,
  formatValue,
}: PreferencePickerProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <SectionLabel>{label}</SectionLabel>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.pickerRow}
        className="active:opacity-80"
      >
        <Text style={styles.pickerValue}>{formatValue(value)}</Text>
        <Ionicons name="chevron-down" size={16} color="rgba(228,228,228,0.38)" />
      </Pressable>
      <OptionSelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        options={options.map((option) => ({
          value: option.value,
          label: option.label,
          description: option.description,
        }))}
        value={value}
        onSelect={onChange}
      />
    </View>
  );
}

export type PlayingProfileFormValues = {
  dominant_hand: DominantHand;
  court_side_preference: PositionPreference;
  years_playing: string;
};

type PlayingProfileFieldsProps<T extends FieldValues & PlayingProfileFormValues> = {
  control: Control<T>;
  errors: FieldErrors<T>;
};

export function PlayingProfileFields<T extends FieldValues & PlayingProfileFormValues>({
  control,
  errors,
}: PlayingProfileFieldsProps<T>) {
  const { field: handField } = useController({
    control,
    name: 'dominant_hand' as Path<T>,
  });
  const { field: sideField } = useController({
    control,
    name: 'court_side_preference' as Path<T>,
  });
  const { field: yearsField } = useController({
    control,
    name: 'years_playing' as Path<T>,
  });
  const [yearsFocused, setYearsFocused] = useState(false);

  const yearsError = errors.years_playing as { message?: string } | undefined;
  const yearsBorder = yearsError
    ? BORDER_ERROR
    : yearsFocused
      ? BORDER_FOCUSED
      : BORDER_DEFAULT;

  const handFormat = useMemo(
    () => (value: DominantHand) => formatDominantHandLabel(value) ?? 'Prefer not to say',
    [],
  );

  return (
    <View style={styles.root}>
      <PreferencePicker
        label="Dominant hand — Optional"
        value={handField.value}
        options={DOMINANT_HAND_OPTIONS}
        onChange={handField.onChange}
        formatValue={handFormat}
      />

      <PreferencePicker
        label="Court side — Optional"
        value={sideField.value}
        options={PLAYER_COURT_SIDE_OPTIONS}
        onChange={sideField.onChange}
        formatValue={formatPositionLabel}
      />

      <View style={styles.fieldBlock}>
        <SectionLabel>Years playing — Optional</SectionLabel>
        <TextInput
          value={yearsField.value}
          onChangeText={(text) => yearsField.onChange(text.replace(/[^0-9]/g, ''))}
          onBlur={() => {
            yearsField.onBlur();
            setYearsFocused(false);
          }}
          onFocus={() => setYearsFocused(true)}
          keyboardType="number-pad"
          placeholder="e.g. 3"
          placeholderTextColor={PLACEHOLDER_COLOR}
          style={[styles.yearsInput, { borderColor: yearsBorder }]}
          className="bg-surface-2 font-grotesk text-base text-neutral"
        />
        <FieldError message={yearsError?.message} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  fieldBlock: {
    marginBottom: 24,
  },
  pickerRow: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: '#202126',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    color: '#E4E4E4',
  },
  yearsInput: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
});
