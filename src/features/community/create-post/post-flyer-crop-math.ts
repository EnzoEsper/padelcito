import type { FlyerCropRect } from '@/features/community/create-post/post-flyer-asset';

export type CropTransform = {
  centerX: number;
  centerY: number;
  scale: number;
};

export type CropFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function computeCropFrame(
  viewportWidth: number,
  viewportHeight: number,
): CropFrame {
  const width = viewportWidth * 0.9;
  const height = viewportHeight * 0.62;
  return {
    x: (viewportWidth - width) / 2,
    y: (viewportHeight - height) / 2,
    width,
    height,
  };
}

export function clampCropFrame(
  frame: CropFrame,
  viewportWidth: number,
  viewportHeight: number,
): CropFrame {
  'worklet';
  const minSize = 80;
  let { x, y, width, height } = frame;
  width = Math.max(minSize, Math.min(width, viewportWidth));
  height = Math.max(minSize, Math.min(height, viewportHeight));
  x = Math.max(0, Math.min(x, viewportWidth - width));
  y = Math.max(0, Math.min(y, viewportHeight - height));
  return { x, y, width, height };
}

export function computeInitialCropTransform(
  imageWidth: number,
  imageHeight: number,
  frame: CropFrame,
): CropTransform {
  const scale = Math.max(frame.width / imageWidth, frame.height / imageHeight);

  return {
    centerX: frame.x + frame.width / 2,
    centerY: frame.y + frame.height / 2,
    scale,
  };
}

export function computeCropRectFromTransform(
  imageWidth: number,
  imageHeight: number,
  frame: CropFrame,
  transform: CropTransform,
): FlyerCropRect {
  let originX = (frame.x - transform.centerX) / transform.scale + imageWidth / 2;
  let originY = (frame.y - transform.centerY) / transform.scale + imageHeight / 2;
  let width = frame.width / transform.scale;
  let height = frame.height / transform.scale;

  originX = Math.max(0, Math.min(originX, imageWidth - 1));
  originY = Math.max(0, Math.min(originY, imageHeight - 1));
  width = Math.min(width, imageWidth - originX);
  height = Math.min(height, imageHeight - originY);

  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}
