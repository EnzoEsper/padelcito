import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable as RNPressable, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View, Text, Pressable } from '@/tw';
import { formatMatchTime } from '@/lib/match-time';
import { useCreateMatch } from '@/features/matches/use-matches';
import {
  courtCapacityLabel,
} from '@/lib/padel-court';
import { DURATION_OPTIONS, useCreateMatchForm, type CreateMatchFormHook } from './use-create-match-form';
import { SectionLabel } from './components/section-label';
import { SegmentedControl } from './components/segmented-control';
import { StepperField } from './components/stepper-field';
import { CategoryRangePicker } from './components/category-range-picker';
import { PlayerRosterPreview } from './components/player-roster-preview';
import { LocationField } from './components/location-field';
import { AdvancedSettingsPanel } from './components/advanced-settings-panel';
import { DurationSelect } from './components/duration-select';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

type CreateMatchFormBodyProps = {
  form: CreateMatchFormHook;
};

export function CreateMatchFormBody({ form }: CreateMatchFormBodyProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  function handleDateChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed' || selected === undefined) return;
    form.setDatePart(selected);
  }

  function handleTimeChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'dismissed' || selected === undefined) return;
    form.setTimePart(selected);
  }

  return (
    <>
      <View className="gap-6">
        <LocationField
          venueName={form.venueName}
          onVenueNameChange={form.setVenueName}
          coords={form.coords}
          onCoordsChange={form.setCoords}
          placeLabel={form.placeLabel}
          onPlaceLabelChange={form.setPlaceLabel}
        />

        <View>
          <SectionLabel>Date, time & duration</SectionLabel>
          <View className="rounded-xl bg-surface-1 border border-neutral/10 flex-row overflow-hidden">
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-[1.15] min-h-14 px-4 flex-row items-center justify-between border-r border-neutral/10"
            >
              <Text className="font-grotesk text-sm text-neutral" numberOfLines={1}>
                {formatDateLabel(form.datePart)}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="rgba(228,228,228,0.38)" />
            </Pressable>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              className="flex-1 min-h-14 px-4 flex-row items-center justify-between border-r border-neutral/10"
            >
              <Text className="font-mono text-sm text-neutral" numberOfLines={1}>
                {formatMatchTime(form.timePart)}
              </Text>
              <Ionicons name="time-outline" size={16} color="rgba(228,228,228,0.38)" />
            </Pressable>
            <DurationSelect
              embedded
              value={form.durationMinutes}
              options={DURATION_OPTIONS}
              onChange={form.setDurationMinutes}
            />
          </View>
        </View>

        <View>
          <SectionLabel>Courts</SectionLabel>
          <View className="rounded-xl bg-surface-1 border border-neutral/10 px-4">
            <StepperField
              label="Number of courts"
              sublabel={courtCapacityLabel(form.courtConfigs)}
              icon="grid-outline"
              value={form.courtCount}
              onDecrement={() => form.setCourtCount(form.courtCount - 1)}
              onIncrement={() => form.setCourtCount(form.courtCount + 1)}
              decrementDisabled={form.courtCount <= 1}
              incrementDisabled={form.courtCount >= form.maxCourts}
            />
          </View>
        </View>

        <PlayerRosterPreview
          totalPlayers={form.totalPlayers}
          confirmedCount={form.confirmedCount}
          openSpots={form.openSpots}
          onTotalChange={form.setTotalPlayers}
          onOpenSpotsChange={form.setOpenSpots}
          minTotalPlayers={form.minPlayers}
          maxTotalPlayers={form.maxPlayers}
        />

        <View>
          <SectionLabel>Gender</SectionLabel>
          <SegmentedControl
            options={[
              { value: 'male' as const, label: 'Men' },
              { value: 'female' as const, label: 'Women' },
              { value: 'mixed' as const, label: 'Mixed' },
            ]}
            value={form.genderPreference}
            onChange={form.setGenderPreference}
          />
        </View>

        <View>
          <SectionLabel>Difficulty</SectionLabel>
          <SegmentedControl
            options={[
              { value: 'friendly' as const, label: 'Friendly' },
              { value: 'competitive' as const, label: 'Competitive' },
            ]}
            value={form.difficulty}
            onChange={form.setDifficulty}
          />
        </View>

        <View>
          <SectionLabel>Category range</SectionLabel>
          <CategoryRangePicker
            categoryMax={form.categoryMax}
            categoryMin={form.categoryMin}
            onChange={form.setCategoryRange}
          />
        </View>

        <AdvancedSettingsPanel
          expanded={form.advancedExpanded}
          onToggle={() => form.setAdvancedExpanded(!form.advancedExpanded)}
          courtCount={form.courtCount}
          courtConfigs={form.courtConfigs}
          onUpdateCourt={form.updateCourtConfig}
          pricePerPlayer={form.pricePerPlayer}
          onPricePerPlayerChange={form.setPricePerPlayer}
          positionPreference={form.positionPreference}
          onPositionPreferenceChange={form.setPositionPreference}
          ageMin={form.ageMin}
          ageMax={form.ageMax}
          onAgeMinChange={form.setAgeMin}
          onAgeMaxChange={form.setAgeMax}
          notes={form.notes}
          onNotesChange={form.setNotes}
        />
      </View>

      {showDatePicker ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible={showDatePicker}>
            <RNPressable style={styles.modalScrim} onPress={() => setShowDatePicker(false)}>
              <View style={styles.pickerSheet}>
                <DateTimePicker
                  value={form.datePart}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                  themeVariant="dark"
                />
              </View>
            </RNPressable>
          </Modal>
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
          <Modal transparent animationType="fade" visible={showTimePicker}>
            <RNPressable style={styles.modalScrim} onPress={() => setShowTimePicker(false)}>
              <View style={styles.pickerSheet}>
                <DateTimePicker
                  value={form.timePart}
                  mode="time"
                  display="spinner"
                  minuteInterval={15}
                  is24Hour
                  onChange={handleTimeChange}
                  themeVariant="dark"
                />
              </View>
            </RNPressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={form.timePart}
            mode="time"
            display="default"
            minuteInterval={15}
            is24Hour
            onChange={handleTimeChange}
          />
        )
      ) : null}
    </>
  );
}

type CreateMatchPublishFooterProps = {
  form: CreateMatchFormHook;
};

export function CreateMatchPublishFooter({ form }: CreateMatchPublishFooterProps) {
  const router = useRouter();
  const createMatch = useCreateMatch();

  async function handlePublish(): Promise<void> {
    const result = form.buildSubmitInput();
    if (!result.ok) {
      Alert.alert('Cannot publish', result.message);
      return;
    }

    try {
      const matchId = await createMatch.mutateAsync(result.input);
      router.replace(`/(app)/match-detail?id=${matchId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create match.';
      Alert.alert('Create match failed', message);
    }
  }

  return (
    <Pressable
      onPress={() => void handlePublish()}
      disabled={createMatch.isPending}
      className={[
        'h-14 rounded-xl items-center justify-center flex-row gap-2',
        createMatch.isPending ? 'bg-surface-1' : 'bg-primary',
      ].join(' ')}
    >
      {createMatch.isPending ? (
        <ActivityIndicator color="#E4E4E4" size="small" />
      ) : (
        <Ionicons name="flash" size={18} color="#E4E4E4" />
      )}
      <Text className="font-grotesk font-bold text-base text-neutral">
        {createMatch.isPending ? 'Publishing…' : 'Publish match'}
      </Text>
    </Pressable>
  );
}

/** @deprecated Use CreateMatchFormBody from the screen shell instead. */
export function CreateMatchForm() {
  const form = useCreateMatchForm();
  return <CreateMatchFormBody form={form} />;
}

const styles = StyleSheet.create({
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerSheet: {
    backgroundColor: '#141417',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
});
