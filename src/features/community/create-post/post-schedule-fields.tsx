import { useState } from 'react';
import { Platform, View as RNView, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { SegmentedControl } from '@/features/matches/create-match/components/segmented-control';
import { LocationField } from '@/features/location/location-field';
import { DATE_OPTIONAL_TYPES } from '@/features/community/post-display';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';

type Form = ReturnType<typeof useCreatePostForm>;

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

type PostScheduleFieldsProps = {
  form: Form;
};

export function PostScheduleFields({ form }: PostScheduleFieldsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const dateOptional = DATE_OPTIONAL_TYPES.includes(form.type);

  function handleDateChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setDatePart(date);
  }

  function handleTimeChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setTimePart(date);
  }

  function handleEndDateChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowEndDatePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setEndDatePart(date);
  }

  function handleEndTimeChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowEndTimePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setEndTimePart(date);
  }

  return (
    <>
      <View>
        <SectionLabel>When</SectionLabel>
        {dateOptional ? (
          <SegmentedControl
            options={[
              { value: 'yes' as const, label: 'Set date' },
              { value: 'no' as const, label: 'No date' },
            ]}
            value={form.hasEventDate ? 'yes' : 'no'}
            onChange={(value) => form.setHasEventDate(value === 'yes')}
          />
        ) : (
          <Text className="font-grotesk text-sm text-neutral/55 mb-2">
            Date and time are required for this event type.
          </Text>
        )}
      </View>

      {form.hasEventDate ? (
        <>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
            >
              <Text className="font-grotesk text-base text-neutral">
                {formatDateLabel(form.datePart)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
            >
              <Text className="font-grotesk text-base text-neutral">
                {formatTimeLabel(form.timePart)}
              </Text>
            </Pressable>
          </View>

          {form.hasEventEnd ? (
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowEndDatePicker(true)}
                className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
              >
                <Text className="font-grotesk text-base text-neutral">
                  End {formatDateLabel(form.endDatePart)} · {formatTimeLabel(form.endTimePart)}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => form.setHasEventEnd(true)}>
              <Text className="font-grotesk text-sm font-semibold text-neutral/55">
                Add end time
              </Text>
            </Pressable>
          )}
        </>
      ) : null}

      <LocationField
        venueName={form.venueName}
        onVenueNameChange={form.setVenueName}
        coords={form.coords}
        formattedAddress={form.formattedAddress}
        placeId={form.placeId}
        onCoordsChange={form.setCoords}
        onFormattedAddressChange={form.setFormattedAddress}
        onPlaceIdChange={form.setPlaceId}
      />

      {showDatePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            title="Date"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.datePart}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={handleDateChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.datePart}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )
      ) : null}

      {showTimePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            title="Time"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.timePart}
                mode="time"
                display="spinner"
                is24Hour
                onChange={handleTimeChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.timePart}
            mode="time"
            display="default"
            is24Hour
            onChange={handleTimeChange}
          />
        )
      ) : null}

      {showEndDatePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={showEndDatePicker}
            onClose={() => setShowEndDatePicker(false)}
            title="End date"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.endDatePart}
                mode="date"
                display="spinner"
                minimumDate={form.datePart}
                onChange={handleEndDateChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.endDatePart}
            mode="date"
            display="default"
            minimumDate={form.datePart}
            onChange={handleEndDateChange}
          />
        )
      ) : null}

      {showEndTimePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={showEndTimePicker}
            onClose={() => setShowEndTimePicker(false)}
            title="End time"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.endTimePart}
                mode="time"
                display="spinner"
                is24Hour
                onChange={handleEndTimeChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.endTimePart}
            mode="time"
            display="default"
            is24Hour
            onChange={handleEndTimeChange}
          />
        )
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pickerBody: {
    paddingBottom: 12,
  },
});
