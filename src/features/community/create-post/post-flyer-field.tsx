import { useState } from 'react';
import { StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import { PostFlyerPickEditor } from '@/features/community/components/post-flyer-pick-editor';
import { PostImageViewer } from '@/features/community/components/post-image-viewer';
import {
  createPendingFromPickerAsset,
  type EncodedFlyerAsset,
  type PendingFlyerAsset,
} from '@/features/community/create-post/post-flyer-asset';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';

type Form = ReturnType<typeof useCreatePostForm>;

type PostFlyerFieldProps = {
  form: Form;
};

export function PostFlyerField({ form }: PostFlyerFieldProps) {
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

  function handleRemove(): void {
    form.setImageUri(null);
    form.setImageBase64(null);
    form.setImageMimeType(null);
    form.setImageWidth(null);
    form.setImageHeight(null);
  }

  return (
    <>
      {form.imageUri !== null ? (
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setViewerOpen(true)} style={styles.thumbWrap}>
            <Image source={{ uri: form.imageUri }} style={styles.thumb} contentFit="cover" />
          </Pressable>
          <View className="flex-1 gap-2">
            <Text className="font-grotesk text-sm text-neutral/70">Flyer attached</Text>
            <View className="flex-row gap-4">
              <Pressable onPress={() => void handlePickImage()} accessibilityRole="button">
                <Text className="font-grotesk text-sm font-semibold text-neutral/55">Change</Text>
              </Pressable>
              <Pressable onPress={handleRemove} accessibilityRole="button">
                <Text className="font-grotesk text-sm font-semibold text-neutral/55">Remove</Text>
              </Pressable>
            </View>
          </View>
          <PostImageViewer
            visible={viewerOpen}
            uri={form.imageUri}
            onClose={() => setViewerOpen(false)}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => void handlePickImage()}
          className="rounded-xl border border-dashed border-neutral/20 bg-surface-1"
          style={styles.emptyRow}
        >
          <Ionicons name="image-outline" size={22} color="rgba(228,228,228,0.38)" />
          <Text className="font-grotesk text-sm text-neutral/55 ml-2">Add flyer · Optional</Text>
        </Pressable>
      )}

      <PostFlyerPickEditor
        visible={editorOpen}
        asset={pendingAsset}
        onConfirm={handleConfirmFlyer}
        onDiscard={() => {
          setPendingAsset(null);
          setEditorOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrap: {
    width: 56,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
});
