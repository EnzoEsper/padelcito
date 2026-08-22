import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/tw';
import { CachedRemoteImage } from '@/components/cached-remote-image';
import {
  resolveFlyerDisplayHeight,
  type PostFlyerVariant,
} from '@/features/community/components/post-flyer-layout';

type PostFlyerImageProps = {
  uri: string;
  width?: number | null;
  height?: number | null;
  variant: PostFlyerVariant;
  onPress: () => void;
  testID?: string;
};

const C = {
  surface1: '#141417',
  mist: '#E4E4E4',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

export function PostFlyerImage({
  uri,
  width,
  height,
  variant,
  onPress,
  testID,
}: PostFlyerImageProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(screenWidth);
  const [resolvedWidth, setResolvedWidth] = useState<number | null>(width ?? null);
  const [resolvedHeight, setResolvedHeight] = useState<number | null>(height ?? null);
  const [isLoading, setIsLoading] = useState(
    width === null ||
      width === undefined ||
      height === null ||
      height === undefined ||
      width <= 0 ||
      height <= 0,
  );

  useEffect(() => {
    setResolvedWidth(width ?? null);
    setResolvedHeight(height ?? null);
    setIsLoading(
      width === null ||
        width === undefined ||
        height === null ||
        height === undefined ||
        width <= 0 ||
        height <= 0,
    );
  }, [uri, width, height]);

  const displayHeight = resolveFlyerDisplayHeight(
    containerWidth,
    screenHeight,
    variant,
    resolvedWidth,
    resolvedHeight,
  );

  function handleLayout(event: LayoutChangeEvent): void {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0) {
      setContainerWidth(nextWidth);
    }
  }

  function handleLoad(event: { source: { width: number; height: number } }): void {
    const { width: loadedWidth, height: loadedHeight } = event.source;
    if (loadedWidth > 0 && loadedHeight > 0) {
      setResolvedWidth(loadedWidth);
      setResolvedHeight(loadedHeight);
    }
    setIsLoading(false);
  }

  return (
    <Pressable
      onPress={onPress}
      onLayout={handleLayout}
      style={[styles.container, { height: displayHeight }]}
      accessibilityRole="button"
      accessibilityLabel="View full image"
      testID={testID}
    >
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={C.mist} />
        </View>
      ) : null}

      <CachedRemoteImage
        uri={uri}
        style={styles.image}
        contentFit="contain"
        onLoad={handleLoad}
        onLoadEnd={() => setIsLoading(false)}
      />

      <View style={styles.expandBadge} pointerEvents="none">
        <Ionicons name="expand-outline" size={16} color={C.mist} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: C.surface1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.hair,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingState: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface1,
  },
  expandBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(11,11,11,0.72)',
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
