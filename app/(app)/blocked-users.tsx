import { ActivityIndicator, StyleSheet } from 'react-native';
import { Pressable, Text, View } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import { StackScreenLayout } from '@/components/stack-screen-layout';
import {
  blockUserErrorMessage,
  useBlockedUsers,
  useUnblockUser,
} from '@/features/blocks/use-user-blocks';

const C = {
  surface1: '#141417',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  neutral: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  primaryHi: '#5E70B8',
} as const;

export default function BlockedUsersScreen() {
  const appAlert = useAppAlert();
  const blockedQuery = useBlockedUsers();
  const unblockUser = useUnblockUser();

  const handleUnblock = (blockedId: string, displayName: string) => {
    appAlert('Unblock user', `Unblock ${displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () => {
          void unblockUser.mutateAsync(blockedId).catch((error: unknown) => {
            appAlert('Could not unblock', blockUserErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <StackScreenLayout
      eyebrow="SAFETY"
      title="Blocked users"
      subtitle="Blocked users cannot join your matches or see your WhatsApp contact through match flows."
    >
      {blockedQuery.isPending ? (
        <ActivityIndicator color={C.neutral} style={styles.loader} />
      ) : (blockedQuery.data ?? []).length === 0 ? (
        <Text style={styles.empty}>You have not blocked anyone.</Text>
      ) : (
        <View style={styles.card}>
          {(blockedQuery.data ?? []).map((row, index) => {
            const name = row.display_name ?? row.username ?? 'Player';
            return (
              <View
                key={row.blocked_id}
                style={[styles.row, index > 0 ? styles.rowBorder : undefined]}
              >
                <View style={styles.rowMeta}>
                  <Text style={styles.name}>{name}</Text>
                  {row.username !== null && row.username.length > 0 ? (
                    <Text style={styles.username}>@{row.username}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => handleUnblock(row.blocked_id, name)}
                  className="active:opacity-70"
                >
                  <Text style={styles.unblock}>Unblock</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </StackScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 8,
  },
  empty: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    color: C.dim,
  },
  card: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.hair2,
  },
  rowMeta: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: C.neutral,
  },
  username: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    color: C.dim,
    marginTop: 2,
  },
  unblock: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
    color: C.primaryHi,
  },
});
