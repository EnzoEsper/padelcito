import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View as RNView,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable, View, Text, TextInput } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { useCreatePostDiscardGuard } from '@/features/community/create-post/use-create-post-discard-guard';
import { CreatePostScreenShell } from '@/features/community/create-post/components/create-post-screen-shell';
import { CreatePostStepHeader } from '@/features/community/create-post/components/create-post-step-header';
import { useCreatePostFormContext } from '@/features/community/create-post/create-post-form-context';
import { PostFlyerField } from '@/features/community/create-post/post-flyer-field';
import { PostScheduleFields } from '@/features/community/create-post/post-schedule-fields';
import { PostCategoriesFields } from '@/features/community/create-post/post-categories-fields';
import { PostPriceRegistrationFields } from '@/features/community/create-post/post-price-registration-fields';
import { PostMoreDetailsFields } from '@/features/community/create-post/post-more-details-fields';
import { PostContactFields } from '@/features/community/create-post/post-contact-fields';
import { CollapsibleFormSection } from '@/features/community/create-post/components/collapsible-form-section';
import {
  summarizeEventDetailsPanel,
  summarizeOrganizersPanel,
  formatTypeSubtypeLine,
} from '@/features/community/create-post/create-post-form-summaries';
import { useProfileContactGate } from '@/features/community/use-posts';
import type { CreatePostValidationSection } from '@/features/community/create-post/create-post-validation';
import type { CommunityPostType } from '@/features/community/post-display';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

const TITLE_PLACEHOLDERS: Record<CommunityPostType, string> = {
  tournament: 'Summer Open · Club Norte',
  social: 'Friday Americano · Palermo',
  league: 'Winter League · Caballito',
  training: 'Bandeja clinic · Coach Martín',
  special_event: 'Padel Fest · Sunset session',
};

function formIsDirty(form: ReturnType<typeof useCreatePostFormContext>): boolean {
  return (
    form.subtype !== null ||
    form.title.trim().length > 0 ||
    form.coords !== null ||
    form.imageUri !== null ||
    form.divisions.length > 0
  );
}

export default function CreatePostDetailsScreen() {
  const router = useRouter();
  const form = useCreatePostFormContext();
  const contactGate = useProfileContactGate();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<CreatePostValidationSection, number>>>({});
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [errorSection, setErrorSection] = useState<CreatePostValidationSection | null>(null);

  useCreatePostDiscardGuard(formIsDirty(form));

  const registerSection = useCallback(
    (section: CreatePostValidationSection) => (event: LayoutChangeEvent) => {
      sectionOffsets.current[section] = event.nativeEvent.layout.y;
    },
    [],
  );

  function handleReview(): void {
    const result = form.validate('publish');
    if (!result.ok) {
      setInlineError(result.message);
      setErrorSection(result.section);
      if (result.section === 'rules') {
        form.setRulesExpanded(true);
      }
      if (result.section === 'organizers') {
        form.setOrganizersExpanded(true);
      }
      if (result.section === 'basics') {
        form.setDetailsExpanded(true);
      }
      const offset = sectionOffsets.current[result.section];
      if (offset !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: true });
      }
      return;
    }
    setInlineError(null);
    setErrorSection(null);
    router.push('/(app)/create-post/review');
  }

  useEffect(() => {
    if (form.subtype === null) {
      router.replace('/(app)/create-post');
    }
  }, [form.subtype, router]);

  if (form.subtype === null) {
    return null;
  }

  const typeLine = formatTypeSubtypeLine(form.type, form.subtype, form.subtypeNote);
  const authorOnlyOrganizer =
    form.contacts.length === 1 && form.contacts[0]?.isAuthorSlot === true;
  const detailsSummary = summarizeEventDetailsPanel({
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
  const organizersSummary = summarizeOrganizersPanel(form.contacts, authorOnlyOrganizer);

  function sectionError(section: CreatePostValidationSection): string | null {
    return errorSection === section ? inlineError : null;
  }

  return (
    <CreatePostScreenShell
      scrollRef={scrollRef}
      footer={
        <Pressable
          onPress={handleReview}
          className="h-14 rounded-2xl bg-primary border border-primary-hi items-center justify-center"
        >
          <Text className="font-grotesk text-base font-bold text-neutral">Review</Text>
        </Pressable>
      }
    >
      <CreatePostStepHeader
        stepLabel="Community · Step 2 of 3"
        title="Event details"
        subtitle="Add the basics players need. Optional sections stay collapsed until you need them."
      />

      <View className="flex-row items-center gap-2 mb-6">
        <View className="flex-1 rounded-xl bg-surface-1 border border-neutral/10 px-3 py-2">
          <Text className="font-grotesk text-sm font-semibold text-neutral" numberOfLines={1}>
            {typeLine}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(app)/create-post')} className="px-3 py-2">
          <Text className="font-grotesk text-sm font-semibold text-neutral/55">Change</Text>
        </Pressable>
      </View>

      <View className="gap-8">
        <RNView onLayout={registerSection('basics')}>
          <View className="gap-4">
            <View>
              <SectionLabel>Flyer</SectionLabel>
              <PostFlyerField form={form} />
            </View>
            <View>
              <SectionLabel>Title</SectionLabel>
              <TextInput
                value={form.title}
                onChangeText={form.setTitle}
                placeholder={TITLE_PLACEHOLDERS[form.type]}
                placeholderTextColor={PLACEHOLDER_COLOR}
                className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
              />
              {sectionError('basics') ? (
                <Text className="font-grotesk text-sm text-red-400/90 mt-2">{sectionError('basics')}</Text>
              ) : null}
            </View>
          </View>
        </RNView>

        <RNView onLayout={registerSection('schedule')}>
          <View className="gap-4">
            <PostScheduleFields form={form} />
            {sectionError('schedule') ? (
              <Text className="font-grotesk text-sm text-red-400/90">{sectionError('schedule')}</Text>
            ) : null}
          </View>
        </RNView>

        <RNView onLayout={registerSection('categories')}>
          <View className="gap-4">
            <PostCategoriesFields form={form} />
            {sectionError('categories') ? (
              <Text className="font-grotesk text-sm text-red-400/90">{sectionError('categories')}</Text>
            ) : null}
            {sectionError('rules') ? (
              <Text className="font-grotesk text-sm text-red-400/90">{sectionError('rules')}</Text>
            ) : null}
          </View>
        </RNView>

        <RNView onLayout={registerSection('price')}>
          <View className="gap-4">
            <PostPriceRegistrationFields form={form} />
            {sectionError('price') ? (
              <Text className="font-grotesk text-sm text-red-400/90">{sectionError('price')}</Text>
            ) : null}
          </View>
        </RNView>

        <CollapsibleFormSection
          sectionLabel="Optional"
          title="More details"
          subtitle={detailsSummary}
          icon="list-outline"
          expanded={form.detailsExpanded}
          onToggle={() => form.setDetailsExpanded(!form.detailsExpanded)}
        >
          <PostMoreDetailsFields form={form} />
        </CollapsibleFormSection>

        <RNView onLayout={registerSection('organizers')}>
          <CollapsibleFormSection
            sectionLabel="Required"
            title="Organizer contacts"
            subtitle={organizersSummary}
            icon="call-outline"
            expanded={form.organizersExpanded}
            onToggle={() => form.setOrganizersExpanded(!form.organizersExpanded)}
          >
            <PostContactFields
              embedded
              contacts={form.contacts}
              authorPhoneE164={contactGate.data?.whatsappPhone ?? null}
              authorPhoneVerified={contactGate.data?.whatsappVerified === true}
              onChange={form.setContacts}
            />
          </CollapsibleFormSection>
          {sectionError('organizers') ? (
            <Text className="font-grotesk text-sm text-red-400/90 mt-2">{sectionError('organizers')}</Text>
          ) : null}
        </RNView>
      </View>
    </CreatePostScreenShell>
  );
}
