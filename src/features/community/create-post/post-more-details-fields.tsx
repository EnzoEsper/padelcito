import { Pressable, View, Text, TextInput } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { POST_TAG_LABELS, TAG_GROUPS } from '@/features/community/post-display';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type Form = ReturnType<typeof useCreatePostForm>;

type PostMoreDetailsFieldsProps = {
  form: Form;
};

export function PostMoreDetailsFields({ form }: PostMoreDetailsFieldsProps) {
  return (
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
        <SectionLabel>What&apos;s included</SectionLabel>
        {TAG_GROUPS.map((group) => (
          <View key={group.id} className="mb-3">
            <Text className="font-mono text-[10px] uppercase tracking-widest text-neutral/45 mb-2">
              {group.label}
            </Text>
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
    </View>
  );
}
