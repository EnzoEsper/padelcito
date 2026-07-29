import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

export type PendingFlyerAsset = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
};

export type EncodedFlyerAsset = PendingFlyerAsset & {
  base64: string;
};

export type FlyerCropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

const UPLOAD_COMPRESS = 0.85;
const UPLOAD_MIME = 'image/jpeg';

export function createPendingFromPickerAsset(
  asset: ImagePickerAsset,
): PendingFlyerAsset | null {
  if (asset.width <= 0 || asset.height <= 0) {
    return null;
  }

  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? UPLOAD_MIME,
  };
}

export async function encodeFlyerForUpload(
  asset: PendingFlyerAsset,
): Promise<EncodedFlyerAsset> {
  const context = ImageManipulator.manipulate(asset.uri);
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: UPLOAD_COMPRESS,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (result.base64 === undefined) {
    throw new Error('Failed to encode flyer image.');
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: UPLOAD_MIME,
    base64: result.base64,
  };
}

export async function cropFlyerPending(
  asset: PendingFlyerAsset,
  rect: FlyerCropRect,
): Promise<PendingFlyerAsset> {
  const context = ImageManipulator.manipulate(asset.uri);
  context.crop(rect);
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: UPLOAD_COMPRESS,
    format: SaveFormat.JPEG,
    base64: false,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: UPLOAD_MIME,
  };
}
