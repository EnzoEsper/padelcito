import { useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text, TextInput } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { FEE_UNIT_LABELS, type CommunityPostFeeUnit } from '@/features/community/post-display';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

const FEE_UNIT_OPTIONS: CommunityPostFeeUnit[] = ['per_player', 'per_pair', 'per_team'];

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

type PostPriceRegistrationFieldsProps = {
  form: Form;
};

export function PostPriceRegistrationFields({ form }: PostPriceRegistrationFieldsProps) {
  const [showRegDatePicker, setShowRegDatePicker] = useState(false);
  const [showRegTimePicker, setShowRegTimePicker] = useState(false);

  return (
    <View className="gap-4">
      <View>
        <SectionLabel>Entry fee</SectionLabel>
        <View className="flex-row gap-2 mb-2">
          <TextInput
            value={form.entryFeeText}
            onChangeText={form.setEntryFeeText}
            keyboardType="number-pad"
            placeholder="25000"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
          />
          <Pressable
            onPress={() => form.setEntryFeeText('0')}
            className="h-14 px-4 rounded-xl border border-neutral/10 bg-surface-1 justify-center"
          >
            <Text className="font-grotesk text-sm font-semibold text-neutral/70">Free</Text>
          </Pressable>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {FEE_UNIT_OPTIONS.map((unit) => {
            const active = form.feeUnit === unit;
            return (
              <Pressable
                key={unit}
                onPress={() => form.setFeeUnit(unit)}
                className={`px-3 py-2 rounded-xl border ${active ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
              >
                <Text className={`font-grotesk text-sm font-semibold ${active ? 'text-neutral' : 'text-neutral/55'}`}>
                  {FEE_UNIT_LABELS[unit]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <SectionLabel>Registration deadline</SectionLabel>
        <Pressable
          onPress={() => form.setHasRegistrationDeadline(!form.hasRegistrationDeadline)}
          className="flex-row items-center gap-2 mb-3"
        >
          <Ionicons
            name={form.hasRegistrationDeadline ? 'checkbox' : 'square-outline'}
            size={22}
            color={form.hasRegistrationDeadline ? '#7488D8' : 'rgba(228,228,228,0.45)'}
          />
          <Text className="font-grotesk text-sm text-neutral/70">Set a registration deadline</Text>
        </Pressable>
        {form.hasRegistrationDeadline ? (
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setShowRegDatePicker(true)}
              className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
            >
              <Text className="font-grotesk text-base text-neutral">
                {formatDateLabel(form.registrationDatePart)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowRegTimePicker(true)}
              className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
            >
              <Text className="font-grotesk text-base text-neutral">
                {formatTimeLabel(form.registrationTimePart)}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {showRegDatePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet visible onClose={() => setShowRegDatePicker(false)} title="Registration date">
            <DateTimePicker
              value={form.registrationDatePart}
              mode="date"
              display="spinner"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                if (event.type !== 'dismissed' && date !== undefined) form.setRegistrationDatePart(date);
              }}
            />
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.registrationDatePart}
            mode="date"
            onChange={(event, date) => {
              setShowRegDatePicker(false);
              if (event.type !== 'dismissed' && date !== undefined) form.setRegistrationDatePart(date);
            }}
          />
        )
      ) : null}

      {showRegTimePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet visible onClose={() => setShowRegTimePicker(false)} title="Registration time">
            <DateTimePicker
              value={form.registrationTimePart}
              mode="time"
              display="spinner"
              is24Hour
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                if (event.type !== 'dismissed' && date !== undefined) form.setRegistrationTimePart(date);
              }}
            />
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.registrationTimePart}
            mode="time"
            is24Hour
            onChange={(event, date) => {
              setShowRegTimePicker(false);
              if (event.type !== 'dismissed' && date !== undefined) form.setRegistrationTimePart(date);
            }}
          />
        )
      ) : null}
    </View>
  );
}
