import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/tw';

const SHEET_BG = '#1B1C21';
const HORIZONTAL_PADDING = 20;

type AppBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showClose?: boolean;
  maxHeight?: `${number}%`;
  /** When false, children render in a static view (e.g. date pickers). Defaults to true. */
  scrollable?: boolean;
};

function parseSnapPercent(maxHeight: `${number}%`): number {
  const parsed = Number.parseInt(maxHeight.replace('%', ''), 10);
  if (Number.isNaN(parsed)) return 52;
  return Math.min(Math.max(parsed, 25), 90);
}

/** Compact gorhom sheet for pickers and short option lists. */
export function AppBottomSheet({
  visible,
  onClose,
  children,
  title,
  showClose = false,
  maxHeight = '52%',
  scrollable = true,
}: AppBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [mounted, setMounted] = useState(visible);
  const snapPoints = useMemo(() => [`${parseSnapPercent(maxHeight)}%`], [maxHeight]);
  const bottomInset = Math.max(insets.bottom, 16);
  const hasHeader = title !== undefined || showClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;

    if (visible) {
      const frame = requestAnimationFrame(() => {
        sheetRef.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }

    sheetRef.current?.dismiss();
  }, [visible, mounted]);

  const handleDismiss = useCallback(() => {
    onClose();
    setMounted(false);
  }, [onClose]);

  const handleClosePress = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  if (!mounted) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      bottomInset={bottomInset}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      {hasHeader ? (
        <BottomSheetView style={styles.compactHeader}>
          <View style={styles.headerRow}>
            {title !== undefined ? (
              <Text style={styles.title}>{title}</Text>
            ) : (
              <View style={styles.titleSpacer} />
            )}
            {showClose ? (
              <Pressable
                onPress={handleClosePress}
                hitSlop={8}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color="rgba(228,228,228,0.55)" />
              </Pressable>
            ) : null}
          </View>
        </BottomSheetView>
      ) : null}

      {scrollable ? (
        <BottomSheetScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={[styles.staticBody, { paddingBottom: bottomInset }]}>
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(228,228,228,0.22)',
    marginTop: 8,
  },
  compactHeader: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 8,
  },
  headerRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: '#E4E4E4',
  },
  titleSpacer: {
    flex: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228,228,228,0.06)',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 4,
  },
  staticBody: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 4,
  },
});
