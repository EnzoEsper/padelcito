import * as ImagePicker from 'expo-image-picker';
import { Pressable, View, Text, TextInput } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import {
  SCORING_FORMAT_LABELS,
  type CommunityPostScoringFormat,
} from '@/features/community/post-display';
import type { CreatePostFormActions, CreatePostFormState } from '@/features/community/create-post/use-create-post-form';
import { encodeFlyerForUpload, createPendingFromPickerAsset } from '@/features/community/create-post/post-flyer-asset';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

const SCORING_OPTIONS: CommunityPostScoringFormat[] = [
  'best_of_3_sets',
  'two_sets_super_tiebreak',
  'one_set_6',
  'one_set_9',
  'timed_or_points',
  'other',
];

type Form = CreatePostFormState & CreatePostFormActions;

export function PostEventRulesFields({ form }: { form: Form }) {
  async function pickRulesImage(): Promise<void> {
    if (form.rulesImages.length >= 3) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      base64: false,
    });

    if (result.canceled || result.assets[0] === undefined) return;
    const pending = createPendingFromPickerAsset(result.assets[0]);
    if (pending === null) return;
    const encoded = await encodeFlyerForUpload(pending);
    form.addRulesImage({
      uri: encoded.uri,
      base64: encoded.base64,
      mimeType: encoded.mimeType,
    });
  }

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        {SCORING_OPTIONS.map((option) => {
          const active = form.scoringFormat === option;
          return (
            <Pressable
              key={option}
              onPress={() => form.setScoringFormat(option)}
              className={`px-3 py-2 rounded-xl border ${active ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
            >
              <Text className={`font-grotesk text-xs font-semibold ${active ? 'text-neutral' : 'text-neutral/55'}`}>
                {SCORING_FORMAT_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => form.setGoldenPoint(form.goldenPoint === true ? null : true)}
          className={`px-3 py-2 rounded-xl border ${form.goldenPoint === true ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
        >
          <Text className="font-grotesk text-sm font-semibold text-neutral/80">Golden point</Text>
        </Pressable>
        {[2, 3, 4].map((count) => {
          const active = form.guaranteedMatches === count;
          return (
            <Pressable
              key={count}
              onPress={() => form.setGuaranteedMatches(active ? null : count)}
              className={`px-3 py-2 rounded-xl border ${active ? 'bg-primary border-primary-hi' : 'bg-surface-1 border-neutral/10'}`}
            >
              <Text className="font-grotesk text-sm font-semibold text-neutral/80">{count} guaranteed</Text>
            </Pressable>
          );
        })}
      </View>

      <View>
        <SectionLabel>Rules note</SectionLabel>
        <TextInput
          value={form.rulesNote}
          onChangeText={form.setRulesNote}
          placeholder="Extra rules (e.g. groups: 1 set to 9, TB at 8–8…)"
          placeholderTextColor={PLACEHOLDER_COLOR}
          multiline
          className="min-h-[88px] rounded-xl bg-surface-1 border border-neutral/10 px-4 py-3 font-grotesk text-base text-neutral"
        />
      </View>

      {form.rulesImages.length > 0 ? (
        <View className="gap-2">
          {form.rulesImages.map((image, index) => (
            <View
              key={image.uri}
              className="flex-row items-center justify-between rounded-xl bg-surface-1 border border-neutral/10 px-3 py-2"
            >
              <Text className="font-grotesk text-sm text-neutral/70">Rules image {index + 1}</Text>
              <Pressable onPress={() => form.removeRulesImage(index)}>
                <Text className="font-grotesk text-sm font-semibold text-neutral/55">Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {form.rulesImages.length < 3 ? (
        <Pressable
          onPress={() => void pickRulesImage()}
          className="h-12 rounded-xl border border-neutral/10 items-center justify-center bg-surface-1"
        >
          <Text className="font-grotesk text-sm font-semibold text-neutral/55">Add rules image</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
