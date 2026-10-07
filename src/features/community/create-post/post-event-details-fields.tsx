import { useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text, TextInput } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { CategoryRangePicker } from '@/features/matches/create-match/components/category-range-picker';
import {
  DIVISION_GENDER_LABELS,
  FEE_UNIT_LABELS,
  POST_TAG_LABELS,
  TAG_GROUPS,
  formatDivision,
  type CommunityPostDivisionGender,
  type CommunityPostDivisionInput,
  type CommunityPostFeeUnit,
} from '@/features/community/post-display';
import type { CreatePostFormActions, CreatePostFormState } from '@/features/community/create-post/use-create-post-form';
import { PADEL_CATEGORY_MAX, PADEL_CATEGORY_MIN } from '@/lib/padel-category';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

const FEE_UNIT_OPTIONS: CommunityPostFeeUnit[] = ['per_player', 'per_pair', 'per_team'];

const GENDER_OPTIONS: CommunityPostDivisionGender[] = ['male', 'female', 'mixed', 'open'];

type Form = CreatePostFormState & CreatePostFormActions;

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

function emptyDivision(): CommunityPostDivisionInput {
  return {
    gender: 'open',
    category_max: 7,
    category_min: 7,
    category_sum: null,
    age_min: null,
    age_max: null,
    label: null,
  };
}

type DivisionEditorProps = {
  division: CommunityPostDivisionInput;
  onChange: (division: CommunityPostDivisionInput) => void;
};

function DivisionEditor({ division, onChange }: DivisionEditorProps) {
  const [useSuma, setUseSuma] = useState(division.category_sum !== null);

  return (
    <View className="gap-4">
      <View>
        <SectionLabel>Gender</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {GENDER_OPTIONS.map((gender) => {
            const active = division.gender === gender;
            return (
              <Pressable
                key={gender}
                onPress={() => onChange({ ...division, gender })}
                className={`px-3 py-2 rounded-xl border ${active ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
              >
                <Text className={`font-grotesk text-sm font-semibold ${active ? 'text-neutral' : 'text-neutral/55'}`}>
                  {DIVISION_GENDER_LABELS[gender]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <SectionLabel>Category band</SectionLabel>
        <View className="flex-row gap-2 mb-3">
          <Pressable
            onPress={() => {
              setUseSuma(false);
              onChange({
                ...division,
                category_sum: null,
                category_max: division.category_max ?? 7,
                category_min: division.category_min ?? 7,
              });
            }}
            className={`px-3 py-2 rounded-xl border ${!useSuma ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
          >
            <Text className="font-grotesk text-sm font-semibold text-neutral/80">Range</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setUseSuma(true);
              onChange({
                ...division,
                category_min: null,
                category_max: null,
                category_sum: division.category_sum ?? 12,
              });
            }}
            className={`px-3 py-2 rounded-xl border ${useSuma ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
          >
            <Text className="font-grotesk text-sm font-semibold text-neutral/80">Suma</Text>
          </Pressable>
        </View>

        {useSuma ? (
          <TextInput
            value={division.category_sum !== null ? String(division.category_sum) : ''}
            onChangeText={(text) => {
              const parsed = Number.parseInt(text.replace(/\D/g, ''), 10);
              onChange({
                ...division,
                category_sum: Number.isFinite(parsed) ? parsed : null,
              });
            }}
            keyboardType="number-pad"
            placeholder="12"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
          />
        ) : (
          <CategoryRangePicker
            categoryMax={division.category_max ?? PADEL_CATEGORY_MAX}
            categoryMin={division.category_min ?? PADEL_CATEGORY_MIN}
            onChange={(categoryMax, categoryMin) =>
              onChange({ ...division, category_max: categoryMax, category_min: categoryMin })
            }
          />
        )}
      </View>

      <View>
        <SectionLabel>Age bracket (optional)</SectionLabel>
        <View className="flex-row gap-2">
          <TextInput
            value={division.age_min !== null ? String(division.age_min) : ''}
            onChangeText={(text) => {
              const parsed = Number.parseInt(text.replace(/\D/g, ''), 10);
              onChange({
                ...division,
                age_min: Number.isFinite(parsed) ? parsed : null,
              });
            }}
            keyboardType="number-pad"
            placeholder="+40 min"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
          />
          <TextInput
            value={division.age_max !== null ? String(division.age_max) : ''}
            onChangeText={(text) => {
              const parsed = Number.parseInt(text.replace(/\D/g, ''), 10);
              onChange({
                ...division,
                age_max: Number.isFinite(parsed) ? parsed : null,
              });
            }}
            keyboardType="number-pad"
            placeholder="Sub-14 max"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
          />
        </View>
      </View>

      <View>
        <SectionLabel>Custom label (optional)</SectionLabel>
        <TextInput
          value={division.label ?? ''}
          onChangeText={(text) => onChange({ ...division, label: text.trim().length > 0 ? text : null })}
          placeholder="Beginners"
          placeholderTextColor={PLACEHOLDER_COLOR}
          className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
        />
      </View>
    </View>
  );
}

export function PostEventDetailsFields({ form }: { form: Form }) {
  const [divisionSheetOpen, setDivisionSheetOpen] = useState(false);
  const [editingDivisionIndex, setEditingDivisionIndex] = useState<number | null>(null);
  const [draftDivision, setDraftDivision] = useState<CommunityPostDivisionInput>(emptyDivision());
  const [showRegDatePicker, setShowRegDatePicker] = useState(false);
  const [showRegTimePicker, setShowRegTimePicker] = useState(false);

  function openAddDivision(): void {
    setEditingDivisionIndex(null);
    setDraftDivision(emptyDivision());
    setDivisionSheetOpen(true);
  }

  function openEditDivision(index: number): void {
    setEditingDivisionIndex(index);
    setDraftDivision(form.divisions[index] ?? emptyDivision());
    setDivisionSheetOpen(true);
  }

  function saveDivision(): void {
    if (form.divisions.length >= 12 && editingDivisionIndex === null) return;
    const next = [...form.divisions];
    if (editingDivisionIndex === null) {
      next.push(draftDivision);
    } else {
      next[editingDivisionIndex] = draftDivision;
    }
    form.setDivisions(next);
    setDivisionSheetOpen(false);
  }

  function removeDivision(index: number): void {
    form.setDivisions(form.divisions.filter((_, i) => i !== index));
  }

  return (
    <>
      <View className="gap-5">
        <View>
          <SectionLabel>Description</SectionLabel>
          <TextInput
            value={form.description}
            onChangeText={form.setDescription}
            placeholder="Categories, prizes, schedule — or leave details on the flyer."
            placeholderTextColor={PLACEHOLDER_COLOR}
            multiline
            textAlignVertical="top"
            className="min-h-[100px] rounded-xl bg-surface-1 border border-neutral/10 px-4 py-3 font-grotesk text-base text-neutral"
          />
        </View>

        <View>
          <SectionLabel>Divisions</SectionLabel>
          {form.divisions.length > 0 ? (
            <View className="gap-2 mb-3">
              {form.divisions.map((division, index) => (
                <View
                  key={`division-${index}`}
                  className="rounded-xl bg-surface-1 border border-neutral/10 px-3 py-3 flex-row items-center gap-2"
                >
                  <Pressable onPress={() => openEditDivision(index)} className="flex-1">
                    <Text className="font-grotesk text-sm text-neutral">{formatDivision(division)}</Text>
                  </Pressable>
                  <Pressable onPress={() => removeDivision(index)} accessibilityLabel="Remove division">
                    <Ionicons name="close-circle" size={20} color="rgba(228,228,228,0.45)" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          {form.divisions.length < 12 ? (
            <Pressable onPress={openAddDivision} className="h-12 rounded-xl border border-dashed border-neutral/20 items-center justify-center">
              <Text className="font-grotesk text-sm font-semibold text-neutral/55">Add division</Text>
            </Pressable>
          ) : null}
        </View>

        <View>
          <SectionLabel>What&apos;s included</SectionLabel>
          {TAG_GROUPS.map((group) => (
            <View key={group.id} className="mb-3">
              <Text className="font-mono text-[10px] uppercase tracking-widest text-neutral/45 mb-2">{group.label}</Text>
              <View className="flex-row flex-wrap gap-2">
                {group.tags.map((tag) => {
                  const active = form.tags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => form.toggleTag(tag)}
                      className={`px-3 py-2 rounded-xl border ${active ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
                    >
                      <Text className={`font-grotesk text-xs font-semibold ${active ? 'text-neutral' : 'text-neutral/55'}`}>
                        {POST_TAG_LABELS[tag]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View>
          <SectionLabel>Entry fee</SectionLabel>
          <TextInput
            value={form.entryFeeText}
            onChangeText={form.setEntryFeeText}
            keyboardType="number-pad"
            placeholder="25000"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral mb-2"
          />
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
                <Text className="font-grotesk text-base text-neutral">{formatDateLabel(form.registrationDatePart)}</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowRegTimePicker(true)}
                className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
              >
                <Text className="font-grotesk text-base text-neutral">{formatTimeLabel(form.registrationTimePart)}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <AppBottomSheet visible={divisionSheetOpen} onClose={() => setDivisionSheetOpen(false)} title="Division">
        <DivisionEditor division={draftDivision} onChange={setDraftDivision} />
        <Pressable onPress={saveDivision} className="mt-6 h-12 rounded-xl bg-primary items-center justify-center">
          <Text className="font-grotesk text-base font-bold text-neutral">Save division</Text>
        </Pressable>
      </AppBottomSheet>

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
    </>
  );
}
