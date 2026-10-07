import { useState } from 'react';
import { Platform, View as RNView, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { useAppAlert } from '@/components/app-alert-dialog';
import { Pressable, View, Text, TextInput } from '@/tw';
import { LocationField } from '@/features/location/location-field';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { SegmentedControl } from '@/features/matches/create-match/components/segmented-control';
import { PostEventEssentials } from '@/features/community/create-post/post-event-essentials';
import { PostEventDetailsFields } from '@/features/community/create-post/post-event-details-fields';
import { PostEventRulesFields } from '@/features/community/create-post/post-event-rules-fields';
import { PostContactFields } from '@/features/community/create-post/post-contact-fields';
import { CollapsibleFormSection } from '@/features/community/create-post/components/collapsible-form-section';
import {
  mapPublishValidationToPanel,
  summarizeEventDetailsPanel,
  summarizeFormatRulesPanel,
  summarizeOrganizersPanel,
} from '@/features/community/create-post/create-post-form-summaries';
import { scoringAllowedForType } from '@/features/community/post-display';
import { getErrorMessage } from '@/lib/error-message';
import { logger } from '@/lib/logger';
import {
  useAttachPostImage,
  useCreatePost,
  useProfileContactGate,
} from '@/features/community/use-posts';
import { usePhoneVerification } from '@/features/profile/phone-verification-provider';
import { uploadPostImage } from '@/lib/post-storage';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';
import { PostFlyerImage } from '@/features/community/components/post-flyer-image';
import { PostFlyerPickEditor } from '@/features/community/components/post-flyer-pick-editor';
import { PostImageViewer } from '@/features/community/components/post-image-viewer';
import {
  createPendingFromPickerAsset,
  type EncodedFlyerAsset,
  type PendingFlyerAsset,
} from '@/features/community/create-post/post-flyer-asset';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type CreatePostForm = ReturnType<typeof useCreatePostForm>;

type CreatePostFormBodyProps = {
  form: CreatePostForm;
};

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

export function CreatePostFormBody({ form }: CreatePostFormBodyProps) {
  const contactGate = useProfileContactGate();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<PendingFlyerAsset | null>(null);

  async function handlePickImage(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets[0] !== undefined) {
      const pending = createPendingFromPickerAsset(result.assets[0]);
      if (pending === null) {
        return;
      }
      setPendingAsset(pending);
      setEditorOpen(true);
    }
  }

  function handleConfirmFlyer(encoded: EncodedFlyerAsset): void {
    form.setImageUri(encoded.uri);
    form.setImageBase64(encoded.base64);
    form.setImageMimeType(encoded.mimeType);
    form.setImageWidth(encoded.width);
    form.setImageHeight(encoded.height);
    setPendingAsset(null);
    setEditorOpen(false);
  }

  function handleDiscardFlyer(): void {
    setPendingAsset(null);
    setEditorOpen(false);
  }

  function handleDateChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setDatePart(date);
  }

  function handleTimeChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setTimePart(date);
  }

  function handleEndDateChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowEndDatePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setEndDatePart(date);
  }

  function handleEndTimeChange(event: DateTimePickerEvent, date?: Date): void {
    if (Platform.OS === 'android') setShowEndTimePicker(false);
    if (event.type === 'dismissed' || date === undefined) return;
    form.setEndTimePart(date);
  }

  const allowsScoring = scoringAllowedForType(form.type);
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
  const organizersSummary = summarizeOrganizersPanel(form.contacts, authorOnlyOrganizer);

  return (
    <>
      <View className="gap-6">
        <View>
          <SectionLabel>Flyer</SectionLabel>
          <Text className="font-grotesk text-sm text-neutral/55 mb-2">
            Optional — most events put the key info on the image.
          </Text>
          {form.imageUri !== null ? (
            <View className="gap-3">
              <PostFlyerImage
                uri={form.imageUri}
                width={form.imageWidth}
                height={form.imageHeight}
                variant="preview"
                onPress={() => setViewerOpen(true)}
              />
              <Pressable
                onPress={() => void handlePickImage()}
                accessibilityRole="button"
                accessibilityLabel="Change image"
              >
                <Text className="font-grotesk text-sm font-semibold text-neutral/55">
                  Change image
                </Text>
              </Pressable>
              <PostImageViewer
                visible={viewerOpen}
                uri={form.imageUri}
                onClose={() => setViewerOpen(false)}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => void handlePickImage()}
              className="rounded-2xl bg-surface-1 border border-neutral/10 overflow-hidden"
            >
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={28} color="rgba(228,228,228,0.38)" />
                <Text className="font-grotesk text-sm text-neutral/55 mt-2">Add flyer</Text>
              </View>
            </Pressable>
          )}
        </View>

        <PostFlyerPickEditor
          visible={editorOpen}
          asset={pendingAsset}
          onConfirm={handleConfirmFlyer}
          onDiscard={handleDiscardFlyer}
        />

        <View>
          <SectionLabel>Title</SectionLabel>
          <TextInput
            value={form.title}
            onChangeText={form.setTitle}
            placeholder="Summer Open · Club Norte"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
          />
        </View>

        <LocationField
          venueName={form.venueName}
          onVenueNameChange={form.setVenueName}
          coords={form.coords}
          formattedAddress={form.formattedAddress}
          placeId={form.placeId}
          onCoordsChange={form.setCoords}
          onFormattedAddressChange={form.setFormattedAddress}
          onPlaceIdChange={form.setPlaceId}
        />

        <View>
          <SectionLabel>When</SectionLabel>
          <SegmentedControl
            options={[
              { value: 'yes' as const, label: 'Set date' },
              { value: 'no' as const, label: 'No date' },
            ]}
            value={form.hasEventDate ? 'yes' : 'no'}
            onChange={(value) => form.setHasEventDate(value === 'yes')}
          />
        </View>

        {form.hasEventDate ? (
          <>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
              >
                <Text className="font-grotesk text-base text-neutral">
                  {formatDateLabel(form.datePart)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
              >
                <Text className="font-grotesk text-base text-neutral">
                  {formatTimeLabel(form.timePart)}
                </Text>
              </Pressable>
            </View>

            {form.hasEventEnd ? (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setShowEndDatePicker(true)}
                  className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
                >
                  <Text className="font-grotesk text-base text-neutral">
                    End {formatDateLabel(form.endDatePart)} · {formatTimeLabel(form.endTimePart)}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => form.setHasEventEnd(true)}>
                <Text className="font-grotesk text-sm font-semibold text-neutral/55">
                  Add end time
                </Text>
              </Pressable>
            )}
          </>
        ) : null}

        <PostEventEssentials form={form} />

        <CollapsibleFormSection
          sectionLabel="Organizers"
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

        <CollapsibleFormSection
          sectionLabel="Optional"
          title="Event details"
          subtitle={detailsSummary}
          icon="list-outline"
          expanded={form.detailsExpanded}
          onToggle={() => form.setDetailsExpanded(!form.detailsExpanded)}
        >
          <PostEventDetailsFields form={form} />
        </CollapsibleFormSection>

        {allowsScoring ? (
          <CollapsibleFormSection
            sectionLabel="Optional"
            title="Format & rules"
            subtitle={rulesSummary}
            icon="tennisball-outline"
            expanded={form.rulesExpanded}
            onToggle={() => form.setRulesExpanded(!form.rulesExpanded)}
          >
            <PostEventRulesFields form={form} />
          </CollapsibleFormSection>
        ) : null}
      </View>

      {showDatePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            title="Date"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.datePart}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={handleDateChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
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
          <AppBottomSheet
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            title="Time"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.timePart}
                mode="time"
                display="spinner"
                is24Hour
                onChange={handleTimeChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.timePart}
            mode="time"
            display="default"
            is24Hour
            onChange={handleTimeChange}
          />
        )
      ) : null}

      {showEndDatePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={showEndDatePicker}
            onClose={() => setShowEndDatePicker(false)}
            title="End date"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.endDatePart}
                mode="date"
                display="spinner"
                minimumDate={form.datePart}
                onChange={handleEndDateChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.endDatePart}
            mode="date"
            display="default"
            minimumDate={form.datePart}
            onChange={handleEndDateChange}
          />
        )
      ) : null}

      {showEndTimePicker ? (
        Platform.OS === 'ios' ? (
          <AppBottomSheet
            visible={showEndTimePicker}
            onClose={() => setShowEndTimePicker(false)}
            title="End time"
            scrollable={false}
          >
            <RNView style={styles.pickerBody}>
              <DateTimePicker
                value={form.endTimePart}
                mode="time"
                display="spinner"
                is24Hour
                onChange={handleEndTimeChange}
                themeVariant="dark"
              />
            </RNView>
          </AppBottomSheet>
        ) : (
          <DateTimePicker
            value={form.endTimePart}
            mode="time"
            display="default"
            is24Hour
            onChange={handleEndTimeChange}
          />
        )
      ) : null}
    </>
  );
}

type CreatePostPublishFooterProps = {
  form: CreatePostForm;
};

export function CreatePostPublishFooter({ form }: CreatePostPublishFooterProps) {
  const router = useRouter();
  const createPost = useCreatePost();
  const attachPostImage = useAttachPostImage();
  const contactGate = useProfileContactGate();
  const { requireVerifiedWhatsApp } = usePhoneVerification();
  const appAlert = useAppAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPublish(): Promise<void> {
    if (isSubmitting) return;

    const phone = contactGate.data?.whatsappPhone ?? '';
    if (phone.length === 0 || contactGate.data?.whatsappVerified !== true) {
      return;
    }

    const result = form.buildSubmitInput();
    if (!result.ok) {
      const panel = mapPublishValidationToPanel(result.message);
      if (panel !== null) {
        form.expandPanel(panel);
      }
      appAlert('Cannot publish', result.message);
      return;
    }

    if (form.imageUri !== null && form.imageBase64 === null) {
      appAlert('Image upload issue', 'Re-select your post image and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const postId = await createPost.mutateAsync({
        type: result.input.type,
        subtype: result.input.subtype,
        tags: result.input.tags,
        scoringFormat: result.input.scoringFormat,
        goldenPoint: result.input.goldenPoint,
        guaranteedMatches: result.input.guaranteedMatches,
        rulesNote: result.input.rulesNote,
        rulesImages: result.input.rulesImages,
        entryFee: result.input.entryFee,
        feeUnit: result.input.feeUnit,
        registrationDeadline: result.input.registrationDeadline,
        divisions: result.input.divisions,
        title: result.input.title,
        description: result.input.description,
        imagePath: null,
        venueName: result.input.venueName,
        formattedAddress: result.input.formattedAddress,
        coords: result.input.coords,
        eventStart: result.input.eventStart,
        eventEnd: result.input.eventEnd,
        contacts: result.input.contacts,
      });

      if (form.imageBase64 !== null && form.imageMimeType !== null) {
        const userId = contactGate.data?.userId;
        if (userId === undefined) {
          throw new Error('Not authenticated');
        }

        const imagePath = await uploadPostImage(
          userId,
          form.imageBase64,
          form.imageMimeType,
        );
        await attachPostImage.mutateAsync({ postId, imagePath });
      }

      form.reset();

      appAlert(
        'Submitted for review',
        'Your post was sent to moderation. You will be notified when it is approved.',
        [{ text: 'OK', onPress: () => router.replace(`/(app)/post-detail?id=${postId}`) }],
      );
    } catch (error) {
      logger.error('publish post failed', error);
      const message = getErrorMessage(error, 'Could not publish post.');
      appAlert('Publish failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePublish(): void {
    if (isSubmitting) return;
    if (contactGate.data?.isBanned === true) {
      appAlert('Cannot publish', 'Your account cannot publish community posts.');
      return;
    }

    const phone = contactGate.data?.whatsappPhone ?? '';
    if (phone.length === 0) {
      appAlert(
        'WhatsApp required',
        'Add your WhatsApp number to your profile before publishing a post.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to profile',
            onPress: () => router.push('/(app)/profile'),
          },
        ],
      );
      return;
    }

    requireVerifiedWhatsApp(() => {
      void submitPublish();
    });
  }

  return (
    <Pressable
      onPress={handlePublish}
      disabled={isSubmitting}
      className="h-14 rounded-2xl bg-primary border border-primary-hi items-center justify-center"
      style={{ opacity: isSubmitting ? 0.7 : 1 }}
    >
      <Text className="font-grotesk text-base font-bold text-neutral">
        {isSubmitting ? 'Submitting…' : 'Submit for review'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imagePlaceholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: {
    paddingBottom: 12,
  },
});
