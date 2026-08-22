import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedRemoteImage } from '@/components/cached-remote-image';

type PostImageViewerProps = {
  visible: boolean;
  uri: string;
  onClose: () => void;
  accessibilityLabel?: string;
};

export function PostImageViewer({
  visible,
  uri,
  onClose,
  accessibilityLabel = 'Post flyer image',
}: PostImageViewerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <RNPressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close image viewer"
        />

        <View style={styles.content} pointerEvents="box-none">
          <RNPressable
            style={[styles.closeButton, { top: insets.top + 12, right: 16 }]}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close image viewer"
          >
            <Ionicons name="close" size={24} color="#E4E4E4" />
          </RNPressable>

          <CachedRemoteImage
            uri={uri}
            style={[
              styles.image,
              {
                marginTop: insets.top,
                marginBottom: insets.bottom,
              },
            ]}
            contentFit="contain"
            accessibilityLabel={accessibilityLabel}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,20,23,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    flex: 1,
  },
});
