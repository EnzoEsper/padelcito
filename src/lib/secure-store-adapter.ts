import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}_${index}`;
}

export const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const chunkCountRaw = await SecureStore.getItemAsync(chunkKey(key, 0));
    if (chunkCountRaw === null) {
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = Number.parseInt(chunkCountRaw, 10);
    if (!Number.isFinite(chunkCount) || chunkCount < 1) {
      return null;
    }

    const parts: string[] = [];
    for (let index = 1; index <= chunkCount; index += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, index));
      if (part === null) {
        return null;
      }
      parts.push(part);
    }

    return parts.join('');
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(chunkKey(key, 0));
      return;
    }

    const chunks: string[] = [];
    for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
      chunks.push(value.slice(offset, offset + CHUNK_SIZE));
    }

    await SecureStore.setItemAsync(chunkKey(key, 0), String(chunks.length));
    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(chunkKey(key, index + 1), chunks[index] ?? '');
    }
    await SecureStore.deleteItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    const chunkCountRaw = await SecureStore.getItemAsync(chunkKey(key, 0));
    if (chunkCountRaw !== null) {
      const chunkCount = Number.parseInt(chunkCountRaw, 10);
      if (Number.isFinite(chunkCount) && chunkCount >= 1) {
        for (let index = 1; index <= chunkCount; index += 1) {
          await SecureStore.deleteItemAsync(chunkKey(key, index));
        }
      }
      await SecureStore.deleteItemAsync(chunkKey(key, 0));
    }

    await SecureStore.deleteItemAsync(key);
  },
};
