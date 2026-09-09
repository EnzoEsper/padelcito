import { StyleSheet, View } from 'react-native';
import { Text } from '@/tw';
import { LEGAL_URLS } from '@/lib/legal-urls';
import { useProfile } from '@/features/profile/use-profile';

const C = {
  warning: '#E0B15B',
  warningBg: 'rgba(224,176,91,0.12)',
  warningBorder: 'rgba(224,176,91,0.28)',
  text: '#E4E4E4',
} as const;

export function BannedUserBanner() {
  const profileQuery = useProfile();
  const bannedAt = profileQuery.data?.banned_at ?? null;

  if (bannedAt === null) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Account suspended</Text>
      <Text style={styles.body}>
        You cannot create matches or community posts. Contact {LEGAL_URLS.supportEmail} if you
        believe this is an error.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: C.warningBg,
    borderBottomWidth: 1,
    borderBottomColor: C.warningBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  title: {
    color: C.warning,
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
  },
  body: {
    color: C.text,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
  },
});
