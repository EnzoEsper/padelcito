import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { Pressable, View, Text } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import {
  POST_SUBTYPE_LABELS,
  POST_TYPE_LABELS,
  type CommunityPostType,
} from '@/features/community/post-display';
import { SUBTYPES_BY_TYPE, type CreatePostFormActions, type CreatePostFormState } from '@/features/community/create-post/use-create-post-form';
import { formatTypeSubtypeLine } from '@/features/community/create-post/create-post-form-summaries';

const POST_TYPE_OPTIONS: { value: CommunityPostType; label: string }[] = [
  { value: 'tournament', label: POST_TYPE_LABELS.tournament },
  { value: 'social', label: POST_TYPE_LABELS.social },
  { value: 'league', label: POST_TYPE_LABELS.league },
  { value: 'training', label: POST_TYPE_LABELS.training },
  { value: 'special_event', label: POST_TYPE_LABELS.special_event },
];

type Form = CreatePostFormState & CreatePostFormActions;

export function PostEventEssentials({ form }: { form: Form }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const subtypeOptions = useMemo(
    () =>
      SUBTYPES_BY_TYPE[form.type].map((value) => ({
        value,
        label: POST_SUBTYPE_LABELS[value],
      })),
    [form.type],
  );

  const summaryLine = formatTypeSubtypeLine(
    form.type,
    form.subtype,
    POST_TYPE_LABELS[form.type],
  );

  return (
    <>
      <View>
        <SectionLabel>Event type</SectionLabel>
        <Pressable
          onPress={() => setSheetOpen(true)}
          className="min-h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 py-3 flex-row items-center justify-between gap-3"
        >
          <Text className="font-grotesk text-base text-neutral flex-1" numberOfLines={2}>
            {summaryLine}
          </Text>
          <Ionicons name="chevron-down" size={18} color="rgba(228,228,228,0.55)" />
        </Pressable>
      </View>

      <AppBottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Event type & format">
        <View className="gap-5 pb-4">
          <View>
            <Text className="font-mono text-[10px] uppercase tracking-widest text-neutral/45 mb-2">
              Type
            </Text>
            {POST_TYPE_OPTIONS.map((option) => {
              const active = form.type === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => form.setType(option.value)}
                  className={`mb-2 h-12 rounded-xl border px-4 justify-center ${active ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
                >
                  <Text className={`font-grotesk text-base font-semibold ${active ? 'text-neutral' : 'text-neutral/55'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View>
            <Text className="font-mono text-[10px] uppercase tracking-widest text-neutral/45 mb-2">
              Format
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {subtypeOptions.map((option) => {
                const active = form.subtype === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => form.setSubtype(option.value)}
                    className={`px-3 py-2 rounded-xl border ${active ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
                  >
                    <Text className={`font-grotesk text-sm font-semibold ${active ? 'text-neutral' : 'text-neutral/55'}`}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Pressable
            onPress={() => setSheetOpen(false)}
            className="h-12 rounded-xl bg-primary items-center justify-center"
          >
            <Text className="font-grotesk text-base font-bold text-neutral">Done</Text>
          </Pressable>
        </View>
      </AppBottomSheet>
    </>
  );
}
