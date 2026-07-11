import { useState } from 'react';
import { Platform, View as RNView, StyleSheet, Image } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { useAppAlert } from '@/components/app-alert-dialog';
import { Pressable, View, Text, TextInput } from '@/tw';
import { LocationField } from '@/features/matches/create-match/components/location-field';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import { SegmentedControl } from '@/features/matches/create-match/components/segmented-control';
import {
  useCreateFlyer,
  useProfileContactGate,
} from '@/features/community/use-flyers';
import { uploadFlyerImage } from '@/lib/flyer-storage';
import type { useCreateFlyerForm } from '@/features/community/create-flyer/use-create-flyer-form';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type CreateFlyerForm = ReturnType<typeof useCreateFlyerForm>;

type CreateFlyerFormBodyProps = {
  form: CreateFlyerForm;
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

export function CreateFlyerFormBody({ form }: CreateFlyerFormBodyProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  async function handlePickImage(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0] !== undefined) {
      form.setImageUri(result.assets[0].uri);
    }
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
          <Pressable
            onPress={() => void handlePickImage()}
            className="rounded-2xl bg-surface-1 border border-neutral/10 overflow-hidden"
          >
            {form.imageUri !== null ? (
              <Image source={{ uri: form.imageUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={28} color="rgba(228,228,228,0.38)" />
                <Text className="font-grotesk text-sm text-neutral/55 mt-2">Upload flyer image</Text>
              </View>
            )}
          </Pressable>
        </View>

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
          <AppBottomSheet visible={showDatePicker} onClose={() => setShowDatePicker(false)} title="Date">
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
          <AppBottomSheet visible={showTimePicker} onClose={() => setShowTimePicker(false)} title="Time">
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

type CreateFlyerPublishFooterProps = {
  form: CreateFlyerForm;
};

export function CreateFlyerPublishFooter({ form }: CreateFlyerPublishFooterProps) {
  const router = useRouter();
  const createFlyer = useCreateFlyer();
  const contactGate = useProfileContactGate();
  const appAlert = useAppAlert();

  async function handlePublish(): Promise<void> {
    if (contactGate.data?.isBanned === true) {
      appAlert('Cannot publish', 'Your account cannot publish community flyers.');
      return;
    }

    const phone = contactGate.data?.whatsappPhone ?? '';
    if (phone.length === 0) {
      appAlert(
        'WhatsApp required',
        'Add your WhatsApp number to your profile before publishing a flyer.',
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

    try {
      let imagePath: string | null = null;
      if (result.input.imageUri !== null) {
        const userId = contactGate.data?.userId;
        if (userId === undefined) {
          throw new Error('Not authenticated');
        }
        imagePath = await uploadFlyerImage(userId, result.input.imageUri);
      }

      const flyerId = await createFlyer.mutateAsync({
        type: result.input.type,
        title: result.input.title,
        description: result.input.description,
        imagePath,
        venueName: result.input.venueName,
        formattedAddress: result.input.formattedAddress,
        coords: result.input.coords,
        eventStart: result.input.eventStart,
        eventEnd: result.input.eventEnd,
        contactPhone: phone,
      });

      appAlert(
        'Submitted for review',
        'Your flyer was sent to moderation. You will be notified when it is approved.',
        [{ text: 'OK', onPress: () => router.replace(`/(app)/flyer-detail?id=${flyerId}`) }],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not publish flyer.';
      appAlert('Publish failed', message);
    }
  }

  return (
    <Pressable
      onPress={() => void handlePublish()}
      disabled={createFlyer.isPending}
      className="h-14 rounded-2xl bg-primary border border-primary-hi items-center justify-center"
      style={{ opacity: createFlyer.isPending ? 0.7 : 1 }}
    >
      <Text className="font-grotesk text-base font-bold text-neutral">
        {createFlyer.isPending ? 'Submitting…' : 'Submit for review'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  previewImage: {
    width: '100%',
    height: 220,
  },
  imagePlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: {
    paddingBottom: 12,
  },
});
