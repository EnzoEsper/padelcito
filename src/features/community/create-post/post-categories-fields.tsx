import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text, TextInput } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { CategoryRangePicker } from '@/features/matches/create-match/components/category-range-picker';
import {
  DIVISION_GENDER_LABELS,
  DIVISION_REQUIRED_TYPES,
  formatDivision,
  normalizeCommunityPostDivision,
  scoringAllowedForType,
  type CommunityPostDivisionGender,
  type CommunityPostDivisionInput,
} from '@/features/community/post-display';
import { PostEventRulesFields } from '@/features/community/create-post/post-event-rules-fields';
import { CollapsibleFormSection } from '@/features/community/create-post/components/collapsible-form-section';
import { summarizeFormatRulesPanel } from '@/features/community/create-post/create-post-form-summaries';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';
import { PADEL_CATEGORY_MAX, PADEL_CATEGORY_MIN } from '@/lib/padel-category';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type Form = ReturnType<typeof useCreatePostForm>;

function emptyDivision(forceSuma: boolean): CommunityPostDivisionInput {
  return {
    gender: 'open',
    category_max: forceSuma ? null : 7,
    category_min: forceSuma ? null : 7,
    category_sum: forceSuma ? 12 : null,
    age_min: null,
    age_max: null,
    label: null,
  };
}

const GENDER_OPTIONS: CommunityPostDivisionGender[] = ['male', 'female', 'mixed', 'open'];

type DivisionEditorProps = {
  division: CommunityPostDivisionInput;
  forceSuma: boolean;
  onChange: (division: CommunityPostDivisionInput) => void;
};

function DivisionEditor({ division, forceSuma, onChange }: DivisionEditorProps) {
  const [useSuma, setUseSuma] = useState(forceSuma || division.category_sum !== null);

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
        {forceSuma ? (
          <TextInput
            value={division.category_sum !== null ? String(division.category_sum) : ''}
            onChangeText={(text) => {
              const parsed = Number.parseInt(text.replace(/\D/g, ''), 10);
              onChange(
                normalizeCommunityPostDivision({
                  ...division,
                  category_sum: Number.isFinite(parsed) ? parsed : null,
                }),
              );
            }}
            keyboardType="number-pad"
            placeholder="12"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
          />
        ) : (
          <>
            <View className="flex-row gap-2 mb-3">
              <Pressable
                onPress={() => {
                  setUseSuma(false);
                  onChange(
                    normalizeCommunityPostDivision({
                      ...division,
                      category_sum: null,
                      category_max: division.category_max ?? 7,
                      category_min: division.category_min ?? 7,
                    }),
                  );
                }}
                className={`px-3 py-2 rounded-xl border ${!useSuma ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
              >
                <Text className="font-grotesk text-sm font-semibold text-neutral/80">Range</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setUseSuma(true);
                  onChange(
                    normalizeCommunityPostDivision({
                      ...division,
                      category_sum: division.category_sum ?? 12,
                    }),
                  );
                }}
                className={`px-3 py-2 rounded-xl border ${useSuma ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
              >
                <Text className="font-grotesk text-sm font-semibold text-neutral/80">Sum</Text>
              </Pressable>
            </View>

            {useSuma ? (
              <TextInput
                value={division.category_sum !== null ? String(division.category_sum) : ''}
                onChangeText={(text) => {
                  const parsed = Number.parseInt(text.replace(/\D/g, ''), 10);
                  onChange(
                    normalizeCommunityPostDivision({
                      ...division,
                      category_sum: Number.isFinite(parsed) ? parsed : null,
                    }),
                  );
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
                  onChange(
                    normalizeCommunityPostDivision({
                      ...division,
                      category_max: categoryMax,
                      category_min: categoryMin,
                    }),
                  )
                }
              />
            )}
          </>
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

type PostCategoriesFieldsProps = {
  form: Form;
};

export function PostCategoriesFields({ form }: PostCategoriesFieldsProps) {
  const [divisionSheetOpen, setDivisionSheetOpen] = useState(false);
  const [editingDivisionIndex, setEditingDivisionIndex] = useState<number | null>(null);
  const [draftDivision, setDraftDivision] = useState<CommunityPostDivisionInput>(emptyDivision(false));

  const required = DIVISION_REQUIRED_TYPES.includes(form.type);
  const allowsScoring = scoringAllowedForType(form.type);

  const rulesSummary = summarizeFormatRulesPanel({
    description: form.description,
    divisionsCount: form.divisions.length,
    entryFeeText: form.entryFeeText,
    feeUnit: form.feeUnit,
    hasRegistrationDeadline: form.hasRegistrationDeadline,
    tags: form.tags,
    scoringFormat: form.scoringFormat,
    type: form.type,
    rulesNote: form.rulesNote,
  });

  function openAddDivision(): void {
    setEditingDivisionIndex(null);
    setDraftDivision(emptyDivision(false));
    setDivisionSheetOpen(true);
  }

  function openEditDivision(index: number): void {
    setEditingDivisionIndex(index);
    setDraftDivision(form.divisions[index] ?? emptyDivision(false));
    setDivisionSheetOpen(true);
  }

  function saveDivision(): void {
    if (form.divisions.length >= 12 && editingDivisionIndex === null) return;
    const normalized = normalizeCommunityPostDivision(draftDivision);
    const next = [...form.divisions];
    if (editingDivisionIndex === null) {
      next.push(normalized);
    } else {
      next[editingDivisionIndex] = normalized;
    }
    form.setDivisions(next);
    setDivisionSheetOpen(false);
  }

  function removeDivision(index: number): void {
    form.setDivisions(form.divisions.filter((_, i) => i !== index));
  }

  return (
    <>
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <SectionLabel>Categories</SectionLabel>
          <View
            className={`px-2 py-0.5 rounded-md ${required ? 'bg-primary/20' : 'bg-neutral/10'}`}
          >
            <Text className="font-mono text-[9px] uppercase tracking-wider text-neutral/60">
              {required ? 'Required' : 'Optional'}
            </Text>
          </View>
        </View>
        {!required && form.divisions.length === 0 ? (
          <Text className="font-grotesk text-sm text-neutral/50 mb-2">
            Leave empty to show &quot;All levels&quot; on the post.
          </Text>
        ) : null}
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
                <Pressable onPress={() => removeDivision(index)} accessibilityLabel="Remove category">
                  <Ionicons name="close-circle" size={20} color="rgba(228,228,228,0.45)" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {form.divisions.length < 12 ? (
          <Pressable
            onPress={openAddDivision}
            className="h-12 rounded-xl border border-dashed border-neutral/20 items-center justify-center"
          >
            <Text className="font-grotesk text-sm font-semibold text-neutral/55">Add category</Text>
          </Pressable>
        ) : null}
      </View>

      {allowsScoring ? (
        <CollapsibleFormSection
          sectionLabel="Optional"
          title="Match rules"
          subtitle={rulesSummary}
          icon="tennisball-outline"
          expanded={form.rulesExpanded}
          onToggle={() => form.setRulesExpanded(!form.rulesExpanded)}
        >
          <PostEventRulesFields form={form} />
        </CollapsibleFormSection>
      ) : null}

      <AppBottomSheet visible={divisionSheetOpen} onClose={() => setDivisionSheetOpen(false)} title="Category">
        <DivisionEditor division={draftDivision} forceSuma={false} onChange={setDraftDivision} />
        <Pressable onPress={saveDivision} className="mt-6 h-12 rounded-xl bg-primary items-center justify-center">
          <Text className="font-grotesk text-base font-bold text-neutral">Save category</Text>
        </Pressable>
      </AppBottomSheet>
    </>
  );
}
