import { Share } from 'react-native';
import * as Linking from 'expo-linking';

type ShareOwnProfileOptions = {
  userId: string;
  displayName: string;
  username: string | null;
};

export function buildProfileDeepLink(userId: string): string {
  return Linking.createURL('/player-profile', {
    queryParams: { id: userId },
  });
}

export async function shareOwnProfile(options: ShareOwnProfileOptions): Promise<void> {
  const url = buildProfileDeepLink(options.userId);
  const handle =
    options.username !== null && options.username.length > 0
      ? `@${options.username}`
      : options.displayName;

  await Share.share({
    message: `Check out ${handle} on Padelcito: ${url}`,
    url,
  });
}
