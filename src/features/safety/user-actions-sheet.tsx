import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from '@/tw';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import { useAppAlert } from '@/components/app-alert-dialog';
import { useBlockUserAction } from '@/features/blocks/block-user-action';
import {
  USER_REPORT_REASONS,
  USER_REPORT_REASON_LABELS,
} from '@/features/safety/safety-display';
import {
  reportUserErrorMessage,
  useReportUser,
} from '@/features/safety/use-user-reports';

export type UserActionContext = {
  matchId?: string;
  postId?: string;
  onBlocked?: () => void;
};

type UserActionTarget = {
  userId: string;
  displayName: string;
  context: UserActionContext;
};

export function useUserActionsSheet() {
  const appAlert = useAppAlert();
  const blockUser = useBlockUserAction();
  const reportUser = useReportUser();
  const [target, setTarget] = useState<UserActionTarget | null>(null);

  const close = useCallback(() => {
    setTarget(null);
  }, []);

  const open = useCallback((params: UserActionTarget) => {
    setTarget(params);
  }, []);

  const handleReport = useCallback(() => {
    if (target === null) {
      return;
    }

    const { userId, displayName, context } = target;
    close();

    appAlert('Report user', `Why are you reporting ${displayName}?`, [
      ...USER_REPORT_REASONS.map((reason) => ({
        text: USER_REPORT_REASON_LABELS[reason],
        onPress: () => {
          void reportUser
            .mutateAsync({
              reportedId: userId,
              reason,
              matchId: context.matchId ?? null,
              postId: context.postId ?? null,
            })
            .then(() => {
              appAlert('Report submitted', 'Thanks — moderators will review this report.');
            })
            .catch((error: unknown) => {
              appAlert('Report failed', reportUserErrorMessage(error));
            });
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [appAlert, close, reportUser, target]);

  const handleBlock = useCallback(() => {
    if (target === null) {
      return;
    }

    const { userId, displayName, context } = target;
    close();
    blockUser(userId, displayName, { onBlocked: context.onBlocked });
  }, [blockUser, close, target]);

  const sheet = (
    <AppBottomSheet
      visible={target !== null}
      onClose={close}
      title={target?.displayName ?? 'Player'}
      showClose
      maxHeight="40%"
      scrollable={false}
    >
      <View style={styles.actions}>
        <Pressable onPress={handleReport} style={styles.actionRow} className="active:opacity-70">
          <Ionicons name="flag-outline" size={18} color="#E4E4E4" />
          <Text style={styles.actionLabel}>Report user</Text>
        </Pressable>
        <Pressable onPress={handleBlock} style={styles.actionRowDanger} className="active:opacity-70">
          <Ionicons name="ban-outline" size={18} color="#E07B7B" />
          <Text style={styles.actionLabelDanger}>Block user</Text>
        </Pressable>
      </View>
    </AppBottomSheet>
  );

  return { open, close, sheet };
}

const styles = StyleSheet.create({
  actions: {
    gap: 8,
    paddingTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228,228,228,0.055)',
  },
  actionRowDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  actionLabel: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: '#E4E4E4',
  },
  actionLabelDanger: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: '#E07B7B',
  },
});

export function UserActionsTrigger({
  onPress,
  accessibilityLabel = 'User actions',
}: {
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={triggerStyles.button}
      className="active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="ellipsis-horizontal" size={16} color="#E4E4E4" />
    </Pressable>
  );
}

const triggerStyles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
    backgroundColor: '#141417',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
