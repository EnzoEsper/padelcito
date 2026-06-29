import type { ReactNode } from 'react';
import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/tw';

type AppBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showClose?: boolean;
  maxHeight?: `${number}%`;
};

export function AppBottomSheet({
  visible,
  onClose,
  children,
  title,
  showClose = false,
  maxHeight = '52%',
}: AppBottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <RNPressable style={styles.scrim} onPress={onClose}>
        <RNPressable
          style={[styles.sheet, { maxHeight, paddingBottom: Math.max(insets.bottom, 20) }]}
          onPress={() => undefined}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {title !== undefined || showClose ? (
            <View style={styles.headerRow}>
              {title !== undefined ? (
                <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
                  {title}
                </Text>
              ) : (
                <View />
              )}
              {showClose ? (
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={20} color="rgba(228,228,228,0.45)" />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {children}
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1B1C21',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
    paddingHorizontal: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(228,228,228,0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 24,
  },
});
