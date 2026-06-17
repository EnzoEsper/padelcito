import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable as RNPressable, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Pressable } from '@/tw';
import { useCreateMatch } from '@/features/matches/use-matches';
import {
  COURT_STRUCTURE_OPTIONS,
  COURT_TYPE_OPTIONS,
  courtCapacityLabel,
} from '@/lib/padel-court';
import { useCreateMatchForm, DURATION_OPTIONS } from './use-create-match-form';
import { SectionLabel } from './components/section-label';
import { SegmentedControl } from './components/segmented-control';
import { StepperField } from './components/stepper-field';
import { CategoryRangePicker } from './components/category-range-picker';
import { PlayerRosterPreview } from './components/player-roster-preview';
import { LocationField } from './components/location-field';
import { AdvancedSettingsPanel } from './components/advanced-settings-panel';

type DatePreset = 'today' | 'tomorrow' | 'pick';

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

function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function CreateMatchForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createMatch = useCreateMatch();
  const form = useCreateMatchForm();

  const [datePreset, setDatePreset] = useState<DatePreset>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return isSameDay(form.datePart, now) ? 'today' : 'pick';
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const durationOptions = useMemo(
    () =>
      DURATION_OPTIONS.map((value) => ({
        value: String(value) as '60' | '90' | '120',
        label: `${value} min`,
      })),
    [],
  );

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

  function handleDatePreset(preset: DatePreset): void {
    setDatePreset(preset);
    if (preset === 'today') {
      form.applyToday();
      return;
    }
    if (preset === 'tomorrow') {
      form.applyTomorrow();
      return;
    }
    setShowDatePicker(true);
  }

  function handleDateChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed' || selected === undefined) return;
    form.setDatePart(selected);
    setDatePreset('pick');
  }

  function handleTimeChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'dismissed' || selected === undefined) return;
    form.setTimePart(selected);
  }

  return (
    <View className="flex-1">
      <View className="gap-5 pb-32">
        <LocationField
          venueName={form.venueName}
          onVenueNameChange={form.setVenueName}
          coords={form.coords}
          onCoordsChange={form.setCoords}
          placeLabel={form.placeLabel}
          onPlaceLabelChange={form.setPlaceLabel}
        />

        <View>
          <SectionLabel>Date & time</SectionLabel>
          <View className="gap-3">
            <SegmentedControl
              options={[
                { value: 'today' as const, label: 'Today' },
                { value: 'tomorrow' as const, label: 'Tomorrow' },
                { value: 'pick' as const, label: 'Pick date' },
              ]}
              value={datePreset}
              onChange={handleDatePreset}
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 flex-row items-center justify-between"
              >
                <Text className="font-grotesk text-base text-neutral">{formatDateLabel(form.datePart)}</Text>
                <Ionicons name="calendar-outline" size={18} color="rgba(228,228,228,0.38)" />
              </Pressable>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 flex-row items-center justify-between"
              >
                <Text className="font-mono text-base text-neutral">{formatTimeLabel(form.timePart)}</Text>
                <Ionicons name="time-outline" size={18} color="rgba(228,228,228,0.38)" />
              </Pressable>
            </View>
          </View>
        </View>

        <View>
          <SectionLabel>Format</SectionLabel>
          <SegmentedControl
            options={durationOptions}
            value={String(form.durationMinutes) as '60' | '90' | '120'}
            onChange={(value) =>
              form.setDurationMinutes(Number.parseInt(value, 10) as (typeof DURATION_OPTIONS)[number])
            }
          />
        </View>

        <View>
          <SectionLabel>Courts</SectionLabel>
          <View className="rounded-xl bg-surface-1 border border-neutral/10 px-4">
            <StepperField
              label="Number of courts"
              sublabel={courtCapacityLabel(form.courtCount)}
              icon="grid-outline"
              value={form.courtCount}
              onDecrement={() => form.setCourtCount(form.courtCount - 1)}
              onIncrement={() => form.setCourtCount(form.courtCount + 1)}
              decrementDisabled={form.courtCount <= 1}
              incrementDisabled={form.courtCount >= form.maxCourts}
            />
          </View>
          <View className="mt-3 gap-3">
            <View>
              <Text className="font-grotesk text-xs text-neutral/60 mb-2">Court type</Text>
              <SegmentedControl
                options={COURT_TYPE_OPTIONS}
                value={form.courtType}
                onChange={form.setCourtType}
              />
            </View>
            <View>
              <Text className="font-grotesk text-xs text-neutral/60 mb-2">Court structure</Text>
              <SegmentedControl
                options={COURT_STRUCTURE_OPTIONS}
                value={form.courtStructure}
                onChange={form.setCourtStructure}
              />
            </View>
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
          courtSurface={form.courtSurface}
          onCourtSurfaceChange={form.setCourtSurface}
          pricePerPlayer={form.pricePerPlayer}
          onPricePerPlayerChange={form.setPricePerPlayer}
          positionsSought={form.positionsSought}
          onTogglePosition={form.togglePosition}
          genderPreference={form.genderPreference}
          onGenderPreferenceChange={form.setGenderPreference}
          ageMin={form.ageMin}
          ageMax={form.ageMax}
          onAgeMinChange={form.setAgeMin}
          onAgeMaxChange={form.setAgeMax}
          difficulty={form.difficulty}
          onDifficultyChange={form.setDifficulty}
          notes={form.notes}
          onNotesChange={form.setNotes}
        />
      </View>

      <LinearGradient
        colors={['rgba(11,11,11,0)', '#0B0B0B']}
        style={[styles.footerGradient, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => void handlePublish()}
          disabled={createMatch.isPending}
          className={[
            'h-14 rounded-xl items-center justify-center flex-row gap-2 mx-5',
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
      </LinearGradient>

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
            onChange={handleTimeChange}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 24,
  },
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
