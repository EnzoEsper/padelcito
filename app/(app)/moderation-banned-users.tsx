import { ActivityIndicator, StyleSheet } from 'react-native';
import { Pressable, Text, View } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import { StackScreenLayout } from '@/components/stack-screen-layout';
import { useBanPostAuthor, useProfileContactGate } from '@/features/community/use-posts';
import { formatReportRelativeTime } from '@/features/safety/safety-display';
import { useBannedUsers } from '@/features/safety/use-banned-users';
import { toUserFacingError } from '@/lib/error-message';

const C = {
  surface1: '#141417',
  hair: 'rgba(228,228,228,0.10)',
  neutral: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  warning: '#E0B15B',
  danger: '#E07B7B',
} as const;

function displayLabel(name: string, username: string | null): string {
  if (username !== null && username.length > 0) {
    return `${name} (@${username})`;
  }
  return name;
}

export default function ModerationBannedUsersScreen() {
  const appAlert = useAppAlert();
  const contactGate = useProfileContactGate();
  const isModerator = contactGate.data?.isModerator === true;
  const bannedQuery = useBannedUsers({ enabled: isModerator });
  const banAuthor = useBanPostAuthor();

  const handleUnban = (userId: string, displayName: string) => {
    appAlert(
      'Unban user',
      `Unban ${displayName}? They will be able to create matches and posts again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          onPress: () => {
            void banAuthor
              .mutateAsync({ userId, banned: false })
              .then(() => appAlert('Unbanned', `${displayName} can use the platform again.`))
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'Could not unban user.';
                appAlert('Unban failed', message);
              });
          },
        },
      ],
    );
  };

  if (contactGate.isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={C.neutral} />
      </View>
    );
  }

  if (!isModerator) {
    return (
      <StackScreenLayout eyebrow="MODERATION" title="Banned users">
        <Text style={styles.empty}>Moderator access required.</Text>
      </StackScreenLayout>
    );
  }

  const rows = bannedQuery.data ?? [];

  return (
    <StackScreenLayout
      eyebrow="MODERATION"
      title="Banned users"
      subtitle="Platform suspensions stay here after reports are resolved. Unban restores match and post access."
    >
      {bannedQuery.isPending ? (
        <ActivityIndicator color={C.neutral} style={styles.loader} />
      ) : bannedQuery.isError ? (
        <Text style={styles.empty}>
          {toUserFacingError(
            bannedQuery.error,
            'Could not load banned users. Apply the latest Supabase migration, then reload the app.',
          )}
        </Text>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>No banned users right now.</Text>
      ) : (
        <View style={styles.card}>
          {rows.map((user, index) => (
            <View
              key={user.user_id}
              style={[styles.row, index > 0 ? styles.rowBorder : null]}
            >
              <View style={styles.rowMeta}>
                <Text style={styles.rowTitle}>{displayLabel(user.display_name, user.username)}</Text>
                <Text style={styles.rowSub}>
                  Banned {formatReportRelativeTime(user.banned_at)}
                </Text>
              </View>
              <Pressable
                onPress={() => handleUnban(user.user_id, user.display_name)}
                disabled={banAuthor.isPending}
                style={[styles.unbanAction, banAuthor.isPending ? styles.actionDisabled : null]}
              >
                <Text style={styles.unbanActionText}>
                  {banAuthor.isPending ? 'Updating…' : 'Unban'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </StackScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0B0B',
  },
  loader: {
    marginTop: 24,
  },
  empty: {
    color: C.faint,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: C.surface1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.hair,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
  rowMeta: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: C.neutral,
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
  },
  rowSub: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
  },
  unbanAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(224,176,91,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,176,91,0.25)',
  },
  unbanActionText: {
    color: C.warning,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '700',
  },
  actionDisabled: {
    opacity: 0.55,
  },
});
