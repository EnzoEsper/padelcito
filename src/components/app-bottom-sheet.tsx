import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
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

function parseSnapPercent(maxHeight: `${number}%`): number {
  const parsed = Number.parseInt(maxHeight.replace('%', ''), 10);
  if (Number.isNaN(parsed)) return 52;
  return Math.min(Math.max(parsed, 25), 95);
}

export function AppBottomSheet({
  visible,
  onClose,
  children,
  title,
  showClose = false,
  maxHeight = '52%',
}: AppBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => [`${parseSnapPercent(maxHeight)}%`], [maxHeight]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
      return;
    }
    sheetRef.current?.dismiss();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
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
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
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
  handle: {
    width: 40,
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
