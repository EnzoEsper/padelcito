import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/tw';
import { CachedRemoteImage } from '@/components/cached-remote-image';
import { PostFlyerCropScreen } from '@/features/community/components/post-flyer-crop-screen';
import {
  encodeFlyerForUpload,
  type EncodedFlyerAsset,
  type PendingFlyerAsset,
} from '@/features/community/create-post/post-flyer-asset';

type PostFlyerPickEditorProps = {
  visible: boolean;
  asset: PendingFlyerAsset | null;
  onConfirm: (asset: EncodedFlyerAsset) => void;
  onDiscard: () => void;
};

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  mist: '#E4E4E4',
  hair: 'rgba(228,228,228,0.10)',
  blueMid: '#5E70B8',
} as const;

export function PostFlyerPickEditor({
  visible,
  asset,
  onConfirm,
  onDiscard,
}: PostFlyerPickEditorProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentAsset, setCurrentAsset] = useState<PendingFlyerAsset | null>(asset);
  const [cropOpen, setCropOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentAsset(asset);
      setCropOpen(false);
      setIsProcessing(false);
    }
  }, [asset, visible]);

  const previewHeight = Math.min(screenHeight * 0.62, screenWidth * 1.4);

  async function handleDone(): Promise<void> {
    if (currentAsset === null || isProcessing) return;
    setIsProcessing(true);
    try {
      const encoded = await encodeFlyerForUpload(currentAsset);
      onConfirm(encoded);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleClose(): void {
    if (isProcessing) return;
    onDiscard();
  }

  function handleCropApplied(cropped: PendingFlyerAsset): void {
    setCurrentAsset(cropped);
    setCropOpen(false);
  }

  if (currentAsset === null) {
    return null;
  }

  return (
    <>
      <Modal
        visible={visible && !cropOpen}
        animationType="slide"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              disabled={isProcessing}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="font-grotesk text-base text-neutral/55">Cancel</Text>
            </Pressable>
            <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
              Flyer
            </Text>
            <Pressable
              onPress={() => void handleDone()}
              disabled={isProcessing}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Use photo"
            >
              {isProcessing ? (
                <ActivityIndicator color={C.blueMid} size="small" />
              ) : (
                <Text className="font-grotesk text-base font-bold text-[#5E70B8]">Done</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.previewWrap}>
            <View style={[styles.previewFrame, { height: previewHeight }]}>
              <CachedRemoteImage
                uri={currentAsset.uri}
                style={styles.previewImage}
                contentFit="contain"
                accessibilityLabel="Selected flyer preview"
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => setCropOpen(true)}
              disabled={isProcessing}
              style={styles.cropButton}
              accessibilityRole="button"
              accessibilityLabel="Crop image"
            >
              <Ionicons name="crop-outline" size={20} color={C.mist} />
              <Text className="font-grotesk text-sm font-semibold text-neutral">Crop</Text>
            </Pressable>
            <Text className="font-grotesk text-sm text-neutral/55 text-center mt-3">
              Full image will be used unless you crop
            </Text>
          </View>
        </View>
      </Modal>

      <PostFlyerCropScreen
        visible={visible && cropOpen}
        asset={currentAsset}
        onClose={() => setCropOpen(false)}
        onApply={handleCropApplied}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  previewFrame: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
  cropButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.surface1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
