import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

const POSTS_BUCKET = 'community-posts';

export function buildPostImageUrl(imagePath: string | null): string | null {
  if (imagePath === null || imagePath.trim().length === 0) {
    return null;
  }

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (baseUrl === undefined || baseUrl.length === 0) {
    return null;
  }

  return `${baseUrl}/storage/v1/object/public/${POSTS_BUCKET}/${imagePath}`;
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic';
  return 'jpg';
}

export async function uploadPostImage(
  userId: string,
  base64Data: string,
  mimeType: string,
): Promise<string> {
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const extension = extensionForMimeType(mimeType);
  const storagePath = `${userId}/${fileId}.${extension}`;
  const arrayBuffer = decode(base64Data);

  const { error } = await supabase.storage
    .from(POSTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error !== null) {
    throw error;
  }

  return storagePath;
}
