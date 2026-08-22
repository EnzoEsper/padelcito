import { Image } from '@/tw';

/** Shared remote image defaults for community post covers and flyers. */
export const REMOTE_IMAGE_PROPS = {
  cachePolicy: 'memory-disk',
  transition: 150,
  placeholder: { blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' },
} as const;

type CachedRemoteImageProps = {
  uri: string;
  style: import('react-native').StyleProp<import('react-native').ImageStyle>;
  contentFit?: 'cover' | 'contain';
  accessibilityLabel?: string;
  onLoad?: (event: { source: { width: number; height: number } }) => void;
  onLoadEnd?: () => void;
};

export function CachedRemoteImage({
  uri,
  style,
  contentFit = 'cover',
  accessibilityLabel,
  onLoad,
  onLoadEnd,
}: CachedRemoteImageProps) {
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy={REMOTE_IMAGE_PROPS.cachePolicy}
      transition={REMOTE_IMAGE_PROPS.transition}
      placeholder={REMOTE_IMAGE_PROPS.placeholder}
      accessibilityLabel={accessibilityLabel}
      onLoad={onLoad}
      onLoadEnd={onLoadEnd}
    />
  );
}
