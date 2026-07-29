export type PostFlyerVariant = 'preview' | 'hero';

const PREVIEW_MAX_HEIGHT_RATIO = 0.55;
const HERO_MAX_HEIGHT_RATIO = 0.72;
const FALLBACK_ASPECT_RATIO = 4 / 5;

export function resolveFlyerDisplayHeight(
  containerWidth: number,
  screenHeight: number,
  variant: PostFlyerVariant,
  imageWidth: number | null,
  imageHeight: number | null,
): number {
  const maxHeightRatio =
    variant === 'preview' ? PREVIEW_MAX_HEIGHT_RATIO : HERO_MAX_HEIGHT_RATIO;
  const maxHeight = screenHeight * maxHeightRatio;

  if (
    imageWidth !== null &&
    imageHeight !== null &&
    imageWidth > 0 &&
    imageHeight > 0
  ) {
    const naturalHeight = containerWidth * (imageHeight / imageWidth);
    return Math.min(naturalHeight, maxHeight);
  }

  return Math.min(containerWidth / FALLBACK_ASPECT_RATIO, maxHeight);
}
