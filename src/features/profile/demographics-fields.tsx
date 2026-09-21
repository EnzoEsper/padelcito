import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View as RNView } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useController, type Control, type FieldErrors, type FieldValues, type Path } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from '@/tw';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { OptionSelectSheet } from '@/components/option-select';
import {
  PROFILE_GENDER_OPTIONS,
  formatBirthDateLabel,
  formatProfileGenderLabel,
  getBirthDatePickerBounds,
  type ProfileGender,
} from '@/lib/profile-demographics';

const BORDER_DEFAULT = 'rgba(228,228,228,0.10)';

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

function HelperText({ children }: { children: string }) {
  return (
    <Text className="font-grotesk text-sm text-neutral/60 mt-2 leading-5">{children}</Text>
  );
}

type GenderPickerProps = {
  label: string;
  value: ProfileGender;
  onChange: (value: ProfileGender) => void;
};

function GenderPicker({ label, value, onChange }: GenderPickerProps) {
  const [open, setOpen] = useState(false);
  const displayValue = formatProfileGenderLabel(value) ?? 'Skip for now';

  return (
    <View style={styles.fieldBlock}>
      <SectionLabel>{label}</SectionLabel>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.pickerRow}
        className="active:opacity-80"
      >
        <Text style={styles.pickerValue}>{displayValue}</Text>
        <Ionicons name="chevron-down" size={16} color="rgba(228,228,228,0.38)" />
      </Pressable>
      <OptionSelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        options={PROFILE_GENDER_OPTIONS.map((option) => ({
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

type BirthDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

function BirthDatePickerField({ label, value, onChange, error }: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);
  const bounds = useMemo(() => getBirthDatePickerBounds(), []);
  const pickerValue = useMemo(() => {
    if (value.length > 0) {
      const parsed = Date.parse(`${value}T12:00:00`);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed);
      }
    }
    return bounds.maximumDate;
  }, [bounds.maximumDate, value]);

  function handleChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type === 'dismissed' || date === undefined) {
      return;
    }
    const iso = date.toISOString().slice(0, 10);
    onChange(iso);
  }

  return (
    <View style={styles.fieldBlock}>
      <SectionLabel>{label}</SectionLabel>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.pickerRow}
        className="active:opacity-80"
      >
        <Text style={styles.pickerValue}>{formatBirthDateLabel(value.length > 0 ? value : null)}</Text>
        <Ionicons name="calendar-outline" size={16} color="rgba(228,228,228,0.38)" />
      </Pressable>
      {value.length > 0 ? (
        <Pressable onPress={() => onChange('')} className="active:opacity-70 mt-2">
          <Text className="font-grotesk text-sm text-neutral/60">Clear birth date</Text>
        </Pressable>
      ) : null}
      <FieldError message={error} />
      {open ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={open}
            onClose={() => setOpen(false)}
            title="Birth date"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                minimumDate={bounds.minimumDate}
                maximumDate={bounds.maximumDate}
                onChange={handleChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="default"
            minimumDate={bounds.minimumDate}
            maximumDate={bounds.maximumDate}
            onChange={handleChange}
          />
        )
      ) : null}
    </View>
  );
}

export type DemographicsFormValues = {
  gender: ProfileGender;
  birth_date: string;
};

type DemographicsFieldsProps<T extends FieldValues & DemographicsFormValues> = {
  control: Control<T>;
  errors: FieldErrors<T>;
  showIntro?: boolean;
};

export function DemographicsFields<T extends FieldValues & DemographicsFormValues>({
  control,
  errors,
  showIntro = true,
}: DemographicsFieldsProps<T>) {
  const { field: genderField } = useController({
    control,
    name: 'gender' as Path<T>,
  });
  const { field: birthDateField } = useController({
    control,
    name: 'birth_date' as Path<T>,
  });

  const birthDateError = errors.birth_date as { message?: string } | undefined;

  return (
    <View style={styles.root}>
      {showIntro ? (
        <View style={styles.introBlock}>
          <SectionLabel>Help hosts match you</SectionLabel>
          <HelperText>
            Optional and self-reported — not imported from Google or Apple. Your full birthday is
            never shown publicly; only your age may appear on your profile.
          </HelperText>
        </View>
      ) : null}

      <GenderPicker
        label="Gender — Optional"
        value={genderField.value}
        onChange={genderField.onChange}
      />

      <BirthDatePickerField
        label="Birth date — Optional"
        value={birthDateField.value}
        onChange={birthDateField.onChange}
        error={birthDateError?.message}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  introBlock: {
    marginBottom: 8,
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
  pickerBody: {
    paddingVertical: 8,
  },
});
