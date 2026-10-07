import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text, TextInput } from '@/tw';
import {
  POST_SUBTYPE_LABELS,
  POST_TYPE_DESCRIPTIONS,
  POST_TYPE_LABELS,
  SUBTYPES_BY_TYPE,
  SUBTYPE_DESCRIPTIONS_BY_TYPE,
  type CommunityPostType,
} from '@/features/community/post-display';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

const TYPE_ICONS: Record<CommunityPostType, keyof typeof Ionicons.glyphMap> = {
  tournament: 'trophy-outline',
  social: 'people-outline',
  league: 'ribbon-outline',
  training: 'school-outline',
  special_event: 'sparkles-outline',
};

const TYPE_ORDER: CommunityPostType[] = [
  'tournament',
  'social',
  'league',
  'training',
  'special_event',
];

type Form = ReturnType<typeof useCreatePostForm>;

type PostTypeFormatStepProps = {
  form: Form;
};

export function PostTypeFormatStep({ form }: PostTypeFormatStepProps) {
  const [expandedType, setExpandedType] = useState<CommunityPostType | null>(null);

  useEffect(() => {
    if (form.subtype !== null) {
      setExpandedType(form.type);
    }
  }, [form.subtype, form.type]);

  function handleTypeHeaderPress(type: CommunityPostType): void {
    if (expandedType === type) {
      setExpandedType(null);
      return;
    }
    setExpandedType(type);
    form.setType(type);
  }

  return (
    <View className="gap-4">
      {TYPE_ORDER.map((type) => {
        const expanded = expandedType === type;
        const formats = SUBTYPES_BY_TYPE[type];
        const showOtherNote = expanded && form.type === type && form.subtype === 'other';
        return (
          <View key={type} className="rounded-2xl border border-neutral/10 overflow-hidden bg-surface-1">
            <Pressable
              onPress={() => handleTypeHeaderPress(type)}
              className={`px-4 py-4 flex-row items-start gap-3 ${expanded ? 'bg-surface-2/40' : ''}`}
            >
              <View className="w-10 h-10 rounded-xl bg-neutral/5 items-center justify-center">
                <Ionicons name={TYPE_ICONS[type]} size={20} color="rgba(228,228,228,0.75)" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="font-grotesk text-base font-bold text-neutral">
                  {POST_TYPE_LABELS[type]}
                </Text>
                <Text className="font-grotesk text-sm text-neutral/55 leading-5">
                  {POST_TYPE_DESCRIPTIONS[type]}
                </Text>
              </View>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="rgba(228,228,228,0.45)"
              />
            </Pressable>

            {expanded ? (
              <View className="px-4 pb-4 gap-2 border-t border-neutral/10 pt-3">
                {formats.map((subtype) => {
                  const active = form.type === type && form.subtype === subtype;
                  const description = SUBTYPE_DESCRIPTIONS_BY_TYPE[type][subtype];
                  return (
                    <Pressable
                      key={subtype}
                      onPress={() => form.setSubtype(subtype)}
                      className={`rounded-xl border px-3 py-3 flex-row gap-3 items-start ${active ? 'bg-primary border-primary-hi' : 'border-neutral/10 bg-surface-1'}`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full border mt-0.5 items-center justify-center ${active ? 'border-neutral bg-neutral/10' : 'border-neutral/30'}`}
                      >
                        {active ? (
                          <View className="w-2.5 h-2.5 rounded-full bg-neutral" />
                        ) : null}
                      </View>
                      <View className="flex-1 gap-0.5">
                        <Text
                          className={`font-grotesk text-sm font-semibold ${active ? 'text-neutral' : 'text-neutral/80'}`}
                        >
                          {POST_SUBTYPE_LABELS[subtype]}
                        </Text>
                        {description !== undefined ? (
                          <Text
                            className={`font-grotesk text-xs leading-4 ${active ? 'text-neutral/70' : 'text-neutral/50'}`}
                          >
                            {description}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}

                {showOtherNote ? (
                  <View className="mt-2">
                    <Text className="font-mono text-[10px] uppercase tracking-widest text-neutral/45 mb-2">
                      Describe the format
                    </Text>
                    <TextInput
                      value={form.subtypeNote}
                      onChangeText={form.setSubtypeNote}
                      placeholder="e.g. Round robin then playoffs"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      maxLength={60}
                      className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function canContinueTypeStep(form: Form): boolean {
  const result = form.validate('type');
  return result.ok;
}
