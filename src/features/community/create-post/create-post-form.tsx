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
import { getErrorMessage } from '@/lib/error-message';
import { logger } from '@/lib/logger';
import {
  useAttachPostImage,
  useCreatePost,
  useProfileContactGate,
} from '@/features/community/use-posts';
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

  return (
    <>
      <View className="gap-6">
        <View>
          <SectionLabel>Type</SectionLabel>
          <SegmentedControl
            options={[
              { value: 'tournament' as const, label: 'Tournament' },
              { value: 'training' as const, label: 'Training' },
            ]}
            value={form.type}
            onChange={form.setType}
          />
        </View>

        <View>
          <SectionLabel>Flyer image</SectionLabel>
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
                <Text className="font-grotesk text-sm text-neutral/55 mt-2">Upload post image</Text>
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

        <View>
          <SectionLabel>Description</SectionLabel>
          <TextInput
            value={form.description}
            onChangeText={form.setDescription}
            placeholder="Categories, prizes, schedule, or anything players should know."
            placeholderTextColor={PLACEHOLDER_COLOR}
            multiline
            textAlignVertical="top"
            className="min-h-[120px] rounded-xl bg-surface-1 border border-neutral/10 px-4 py-3 font-grotesk text-base text-neutral"
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
          <SectionLabel>Event date</SectionLabel>
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

            <View>
              <SectionLabel>End time (optional)</SectionLabel>
              <SegmentedControl
                options={[
                  { value: 'yes' as const, label: 'Add end' },
                  { value: 'no' as const, label: 'Open-ended' },
                ]}
                value={form.hasEventEnd ? 'yes' : 'no'}
                onChange={(value) => form.setHasEventEnd(value === 'yes')}
              />
            </View>

            {form.hasEventEnd ? (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setShowEndDatePicker(true)}
                  className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
                >
                  <Text className="font-grotesk text-base text-neutral">
                    {formatDateLabel(form.endDatePart)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowEndTimePicker(true)}
                  className="flex-1 h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 justify-center"
                >
                  <Text className="font-grotesk text-base text-neutral">
                    {formatTimeLabel(form.endTimePart)}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
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
  const appAlert = useAppAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePublish(): Promise<void> {
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

    const result = form.buildSubmitInput(phone);
    if (!result.ok) {
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
        title: result.input.title,
        description: result.input.description,
        imagePath: null,
        venueName: result.input.venueName,
        formattedAddress: result.input.formattedAddress,
        coords: result.input.coords,
        eventStart: result.input.eventStart,
        eventEnd: result.input.eventEnd,
        contactPhone: phone,
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

  return (
    <Pressable
      onPress={() => void handlePublish()}
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
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: {
    paddingBottom: 12,
  },
});
