import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/tw';
import {
  clampCropFrame,
  computeCropFrame,
  computeCropRectFromTransform,
  computeInitialCropTransform,
  type CropFrame,
} from '@/features/community/create-post/post-flyer-crop-math';
import {
  cropFlyerPending,
  type PendingFlyerAsset,
} from '@/features/community/create-post/post-flyer-asset';

type PostFlyerCropScreenProps = {
  visible: boolean;
  asset: PendingFlyerAsset;
  onClose: () => void;
  onApply: (asset: PendingFlyerAsset) => void;
};

const C = {
  background: '#0B0B0B',
  mist: '#E4E4E4',
  hair: 'rgba(228,228,228,0.10)',
  blueMid: '#5E70B8',
} as const;

const HANDLE_SIZE = 28;
const HANDLE_HIT = 36;

function assignFrame(
  shared: {
    x: SharedValue<number>;
    y: SharedValue<number>;
    width: SharedValue<number>;
    height: SharedValue<number>;
  },
  frame: CropFrame,
): void {
  shared.x.value = frame.x;
  shared.y.value = frame.y;
  shared.width.value = frame.width;
  shared.height.value = frame.height;
}

export function PostFlyerCropScreen({
  visible,
  asset,
  onClose,
  onApply,
}: PostFlyerCropScreenProps) {
  const insets = useSafeAreaInsets();
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [isApplying, setIsApplying] = useState(false);

  const initialFrame = useMemo(() => {
    if (viewportSize === null) return null;
    return computeCropFrame(viewportSize.width, viewportSize.height);
  }, [viewportSize]);

  const initialTransform = useMemo(() => {
    if (initialFrame === null) return null;
    return computeInitialCropTransform(asset.width, asset.height, initialFrame);
  }, [asset.height, asset.width, initialFrame]);

  const frameX = useSharedValue(0);
  const frameY = useSharedValue(0);
  const frameW = useSharedValue(0);
  const frameH = useSharedValue(0);
  const savedFrameX = useSharedValue(0);
  const savedFrameY = useSharedValue(0);
  const savedFrameW = useSharedValue(0);
  const savedFrameH = useSharedValue(0);

  const centerX = useSharedValue(0);
  const centerY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedCenterX = useSharedValue(0);
  const savedCenterY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const viewportW = useSharedValue(0);
  const viewportH = useSharedValue(0);

  useEffect(() => {
    if (initialFrame === null || initialTransform === null || viewportSize === null) return;

    assignFrame(
      { x: frameX, y: frameY, width: frameW, height: frameH },
      initialFrame,
    );
    assignFrame(
      { x: savedFrameX, y: savedFrameY, width: savedFrameW, height: savedFrameH },
      initialFrame,
    );

    centerX.value = initialTransform.centerX;
    centerY.value = initialTransform.centerY;
    scale.value = initialTransform.scale;
    savedCenterX.value = initialTransform.centerX;
    savedCenterY.value = initialTransform.centerY;
    savedScale.value = initialTransform.scale;

    viewportW.value = viewportSize.width;
    viewportH.value = viewportSize.height;
  // Shared values from useSharedValue are stable; omitting them avoids false immutability lint noise.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional init when layout/asset changes
  }, [
    asset.uri,
    initialFrame,
    initialTransform,
    viewportSize,
  ]);

  function handleViewportLayout(event: LayoutChangeEvent): void {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setViewportSize({ width, height });
    }
  }

  const imagePanGesture = Gesture.Pan()
    .onUpdate((event) => {
      centerX.value = savedCenterX.value + event.translationX;
      centerY.value = savedCenterY.value + event.translationY;
    })
    .onEnd(() => {
      savedCenterX.value = centerX.value;
      savedCenterY.value = centerY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.2, savedScale.value * event.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const imageGesture = Gesture.Simultaneous(imagePanGesture, pinchGesture);

  const moveFrameGesture = Gesture.Pan()
    .onUpdate((event) => {
      const clamped = clampCropFrame(
        {
          x: savedFrameX.value + event.translationX,
          y: savedFrameY.value + event.translationY,
          width: savedFrameW.value,
          height: savedFrameH.value,
        },
        viewportW.value,
        viewportH.value,
      );
      frameX.value = clamped.x;
      frameY.value = clamped.y;
    })
    .onEnd(() => {
      savedFrameX.value = frameX.value;
      savedFrameY.value = frameY.value;
    });

  const cornerTlGesture = Gesture.Pan()
    .onUpdate((event) => {
      const clamped = clampCropFrame(
        {
          x: savedFrameX.value + event.translationX,
          y: savedFrameY.value + event.translationY,
          width: savedFrameW.value - event.translationX,
          height: savedFrameH.value - event.translationY,
        },
        viewportW.value,
        viewportH.value,
      );
      frameX.value = clamped.x;
      frameY.value = clamped.y;
      frameW.value = clamped.width;
      frameH.value = clamped.height;
    })
    .onEnd(() => {
      savedFrameX.value = frameX.value;
      savedFrameY.value = frameY.value;
      savedFrameW.value = frameW.value;
      savedFrameH.value = frameH.value;
    });

  const cornerTrGesture = Gesture.Pan()
    .onUpdate((event) => {
      const clamped = clampCropFrame(
        {
          x: savedFrameX.value,
          y: savedFrameY.value + event.translationY,
          width: savedFrameW.value + event.translationX,
          height: savedFrameH.value - event.translationY,
        },
        viewportW.value,
        viewportH.value,
      );
      frameX.value = clamped.x;
      frameY.value = clamped.y;
      frameW.value = clamped.width;
      frameH.value = clamped.height;
    })
    .onEnd(() => {
      savedFrameX.value = frameX.value;
      savedFrameY.value = frameY.value;
      savedFrameW.value = frameW.value;
      savedFrameH.value = frameH.value;
    });

  const cornerBlGesture = Gesture.Pan()
    .onUpdate((event) => {
      const clamped = clampCropFrame(
        {
          x: savedFrameX.value + event.translationX,
          y: savedFrameY.value,
          width: savedFrameW.value - event.translationX,
          height: savedFrameH.value + event.translationY,
        },
        viewportW.value,
        viewportH.value,
      );
      frameX.value = clamped.x;
      frameY.value = clamped.y;
      frameW.value = clamped.width;
      frameH.value = clamped.height;
    })
    .onEnd(() => {
      savedFrameX.value = frameX.value;
      savedFrameY.value = frameY.value;
      savedFrameW.value = frameW.value;
      savedFrameH.value = frameH.value;
    });

  const cornerBrGesture = Gesture.Pan()
    .onUpdate((event) => {
      const clamped = clampCropFrame(
        {
          x: savedFrameX.value,
          y: savedFrameY.value,
          width: savedFrameW.value + event.translationX,
          height: savedFrameH.value + event.translationY,
        },
        viewportW.value,
        viewportH.value,
      );
      frameX.value = clamped.x;
      frameY.value = clamped.y;
      frameW.value = clamped.width;
      frameH.value = clamped.height;
    })
    .onEnd(() => {
      savedFrameX.value = frameX.value;
      savedFrameY.value = frameY.value;
      savedFrameW.value = frameW.value;
      savedFrameH.value = frameH.value;
    });

  const imageWidth = asset.width;
  const imageHeight = asset.height;

  const imageStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: centerX.value - imageWidth / 2 },
        { translateY: centerY.value - imageHeight / 2 },
        { scale: scale.value },
      ],
    };
  });

  const topMaskStyle = useAnimatedStyle(() => ({
    height: frameY.value,
  }));

  const leftMaskStyle = useAnimatedStyle(() => ({
    top: frameY.value,
    width: frameX.value,
    height: frameH.value,
  }));

  const rightMaskStyle = useAnimatedStyle(() => ({
    top: frameY.value,
    left: frameX.value + frameW.value,
    height: frameH.value,
  }));

  const bottomMaskStyle = useAnimatedStyle(() => ({
    top: frameY.value + frameH.value,
  }));

  const cropFrameStyle = useAnimatedStyle(() => ({
    left: frameX.value,
    top: frameY.value,
    width: frameW.value,
    height: frameH.value,
  }));

  const handleTlStyle = useAnimatedStyle(() => ({
    left: frameX.value - HANDLE_HIT / 2,
    top: frameY.value - HANDLE_HIT / 2,
  }));

  const handleTrStyle = useAnimatedStyle(() => ({
    left: frameX.value + frameW.value - HANDLE_HIT / 2,
    top: frameY.value - HANDLE_HIT / 2,
  }));

  const handleBlStyle = useAnimatedStyle(() => ({
    left: frameX.value - HANDLE_HIT / 2,
    top: frameY.value + frameH.value - HANDLE_HIT / 2,
  }));

  const handleBrStyle = useAnimatedStyle(() => ({
    left: frameX.value + frameW.value - HANDLE_HIT / 2,
    top: frameY.value + frameH.value - HANDLE_HIT / 2,
  }));

  const moveHandleStyle = useAnimatedStyle(() => ({
    left: frameX.value + frameW.value / 2 - 20,
    top: frameY.value - 28,
  }));

  async function handleApply(): Promise<void> {
    if (isApplying) return;
    setIsApplying(true);
    try {
      const frame: CropFrame = {
        x: frameX.value,
        y: frameY.value,
        width: frameW.value,
        height: frameH.value,
      };
      const rect = computeCropRectFromTransform(asset.width, asset.height, frame, {
        centerX: centerX.value,
        centerY: centerY.value,
        scale: scale.value,
      });
      const cropped = await cropFlyerPending(asset, rect);
      onApply(cropped);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={C.mist} />
          </Pressable>
          <Text className="font-grotesk text-base font-bold text-neutral">Crop flyer</Text>
          <Pressable
            onPress={() => void handleApply()}
            disabled={isApplying || initialFrame === null}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Apply crop"
          >
            {isApplying ? (
              <ActivityIndicator color={C.blueMid} size="small" />
            ) : (
              <Text className="font-grotesk text-base font-bold text-[#5E70B8]">Apply</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.viewport} onLayout={handleViewportLayout}>
          {initialFrame !== null ? (
            <>
              <GestureDetector gesture={imageGesture}>
                <Animated.View style={StyleSheet.absoluteFill}>
                  <Animated.Image
                    source={{ uri: asset.uri }}
                    style={[
                      {
                        width: asset.width,
                        height: asset.height,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                      },
                      imageStyle,
                    ]}
                    resizeMode="cover"
                  />
                </Animated.View>
              </GestureDetector>

              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <Animated.View style={[styles.mask, styles.maskTop, topMaskStyle]} />
                <Animated.View style={[styles.mask, styles.maskSide, leftMaskStyle]} />
                <Animated.View style={[styles.mask, styles.maskSide, rightMaskStyle]} />
                <Animated.View style={[styles.mask, styles.maskBottom, bottomMaskStyle]} />

                <Animated.View style={[styles.cropFrame, cropFrameStyle]} pointerEvents="none" />

                <GestureDetector gesture={moveFrameGesture}>
                  <Animated.View style={[styles.moveHandle, moveHandleStyle]}>
                    <View style={styles.moveHandleBar} />
                  </Animated.View>
                </GestureDetector>

                <GestureDetector gesture={cornerTlGesture}>
                  <Animated.View style={[styles.handle, handleTlStyle]}>
                    <View style={[styles.handleCorner, styles.handleCornerTl]} />
                  </Animated.View>
                </GestureDetector>
                <GestureDetector gesture={cornerTrGesture}>
                  <Animated.View style={[styles.handle, handleTrStyle]}>
                    <View style={[styles.handleCorner, styles.handleCornerTr]} />
                  </Animated.View>
                </GestureDetector>
                <GestureDetector gesture={cornerBlGesture}>
                  <Animated.View style={[styles.handle, handleBlStyle]}>
                    <View style={[styles.handleCorner, styles.handleCornerBl]} />
                  </Animated.View>
                </GestureDetector>
                <GestureDetector gesture={cornerBrGesture}>
                  <Animated.View style={[styles.handle, handleBrStyle]}>
                    <View style={[styles.handleCorner, styles.handleCornerBr]} />
                  </Animated.View>
                </GestureDetector>
              </View>
            </>
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text className="font-grotesk text-sm text-neutral/55 text-center">
            Drag corners to resize freely. Drag the top handle to move the crop area. Pinch and
            drag inside to adjust the image.
          </Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskTop: {
    top: 0,
    left: 0,
    right: 0,
  },
  maskSide: {
    position: 'absolute',
  },
  maskBottom: {
    left: 0,
    right: 0,
    bottom: 0,
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: C.mist,
    backgroundColor: 'transparent',
  },
  moveHandle: {
    position: 'absolute',
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveHandleBar: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.mist,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_HIT,
    height: HANDLE_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleCorner: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderColor: C.mist,
  },
  handleCornerTl: {
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  handleCornerTr: {
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  handleCornerBl: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  handleCornerBr: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
});
