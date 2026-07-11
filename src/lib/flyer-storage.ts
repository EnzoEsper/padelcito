import { supabase } from '@/lib/supabase';

const FLYERS_BUCKET = 'flyers';

export function buildFlyerImageUrl(imagePath: string | null): string | null {
  if (imagePath === null || imagePath.trim().length === 0) {
    return null;
  }

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (baseUrl === undefined || baseUrl.length === 0) {
    return null;
  }

  return `${baseUrl}/storage/v1/object/public/${FLYERS_BUCKET}/${imagePath}`;
}

export async function uploadFlyerImage(
  userId: string,
  localUri: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `${userId}/${fileId}.jpg`;

  const { error } = await supabase.storage
    .from(FLYERS_BUCKET)
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error !== null) {
    throw error;
  }

  return storagePath;
}
