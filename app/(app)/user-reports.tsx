import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, Pressable, View, Text } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import { useBanPostAuthor, useProfileContactGate } from '@/features/community/use-posts';
import {
  USER_REPORT_REASON_LABELS,
  buildMatchContextRoute,
  buildModerationBannedUsersRoute,
  buildPostContextRoute,
  formatReportRelativeTime,
} from '@/features/safety/safety-display';
import {
  groupOpenUserReports,
  resolveUserReportErrorMessage,
  useOpenUserReports,
  useResolveAllUserReportsForUser,
  useResolveUserReport,
  type GroupedUserReports,
  type UserReportSummary,
} from '@/features/safety/use-user-reports';
import { useAppContentTopPadding } from '@/lib/app-layout-insets';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  warning: '#E0B15B',
  success: '#5BE0A6',
  danger: '#E07B7B',
} as const;

const BAN_SUCCESS_MESSAGE =
  'The user has been banned. Their matches have been cancelled and open reports resolved.';

function ReportCard({
  report,
  onResolve,
  isResolving,
}: {
  report: UserReportSummary;
  onResolve: () => void;
  isResolving: boolean;
}) {
  const router = useRouter();

  return (
    <View style={styles.reportCard}>
      <Text style={styles.reportReason}>{USER_REPORT_REASON_LABELS[report.reason]}</Text>
      <Text style={styles.reportMeta}>
        Reported by {report.reporter?.display_name ?? 'Player'} ·{' '}
        {formatReportRelativeTime(report.created_at)}
      </Text>
      {report.comment !== null && report.comment.length > 0 ? (
        <Text style={styles.reportComment}>{report.comment}</Text>
      ) : null}
      <View style={styles.contextRow}>
        {report.match_id !== null ? (
          <Pressable
            onPress={() => router.push(buildMatchContextRoute(report.match_id as string))}
            style={styles.contextLink}
          >
            <Text style={styles.contextLinkText}>Match context</Text>
          </Pressable>
        ) : null}
        {report.community_post_id !== null ? (
          <Pressable
            onPress={() =>
              router.push(buildPostContextRoute(report.community_post_id as string))
            }
            style={styles.contextLink}
          >
            <Text style={styles.contextLinkText}>Post context</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.actionRow}>
        <Pressable
          onPress={onResolve}
          disabled={isResolving}
          style={[styles.resolveAction, isResolving ? styles.actionDisabled : null]}
        >
          <Text style={styles.resolveActionText}>{isResolving ? 'Resolving…' : 'Resolve'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GroupCard({
  group,
  onResolve,
  onResolveAll,
  onBan,
  onUnban,
  isBanPending,
  isResolveAllPending,
  resolvingReportId,
}: {
  group: GroupedUserReports;
  onResolve: (reportId: string) => void;
  onResolveAll: (reportIds: string[]) => void;
  onBan: (userId: string, displayName: string) => void;
  onUnban: (userId: string, displayName: string) => void;
  isBanPending: boolean;
  isResolveAllPending: boolean;
  resolvingReportId: string | null;
}) {
  const isBanned = group.reportedBannedAt !== null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{group.reportedName}</Text>
        <View style={styles.headerChips}>
          {isBanned ? <Text style={styles.bannedChip}>Banned</Text> : null}
          <Text style={styles.reportChip}>
            {group.reports.length} open report{group.reports.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <View style={styles.groupActionRow}>
        <Pressable
          onPress={() => onResolveAll(group.reports.map((report) => report.id))}
          disabled={isResolveAllPending || isBanPending}
          style={[
            styles.resolveAllAction,
            isResolveAllPending || isBanPending ? styles.actionDisabled : null,
          ]}
        >
          <Text style={styles.resolveAllActionText}>
            {isResolveAllPending ? 'Resolving…' : 'Resolve all'}
          </Text>
        </Pressable>
        {isBanned ? (
          <Pressable
            onPress={() => onUnban(group.reportedId, group.reportedName)}
            disabled={isBanPending}
            style={[styles.unbanAction, isBanPending ? styles.actionDisabled : null]}
          >
            <Text style={styles.unbanActionText}>{isBanPending ? 'Updating…' : 'Unban user'}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onBan(group.reportedId, group.reportedName)}
            disabled={isBanPending}
            style={[styles.banAction, isBanPending ? styles.actionDisabled : null]}
          >
            <Text style={styles.banActionText}>{isBanPending ? 'Banning…' : 'Ban user'}</Text>
          </Pressable>
        )}
      </View>

      {group.reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onResolve={() => onResolve(report.id)}
          isResolving={resolvingReportId === report.id}
        />
      ))}
    </View>
  );
}

export default function UserReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentTopPadding = useAppContentTopPadding(16);
  const appAlert = useAppAlert();
  const contactGate = useProfileContactGate();
  const reportsQuery = useOpenUserReports({
    enabled: contactGate.data?.isModerator === true,
  });
  const resolveReport = useResolveUserReport();
  const resolveAllReports = useResolveAllUserReportsForUser();
  const banAuthor = useBanPostAuthor();

  const isModerator = contactGate.data?.isModerator === true;
  const groupedReports = useMemo(
    () => groupOpenUserReports(reportsQuery.data ?? []),
    [reportsQuery.data],
  );

  const handleResolve = useCallback(
    (reportId: string): void => {
      appAlert('Resolve report', 'Mark this report as resolved?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: () => {
            void resolveReport
              .mutateAsync(reportId)
              .then(() => appAlert('Resolved', 'The report was marked as resolved.'))
              .catch((error: unknown) => {
                appAlert('Resolve failed', resolveUserReportErrorMessage(error));
              });
          },
        },
      ]);
    },
    [appAlert, resolveReport],
  );

  const handleResolveAll = useCallback(
    (reportIds: string[]): void => {
      appAlert(
        'Resolve all reports',
        `Mark all ${reportIds.length} open reports for this user as resolved?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Resolve all',
            style: 'destructive',
            onPress: () => {
              void resolveAllReports
                .mutateAsync(reportIds)
                .then(() => appAlert('Resolved', 'All reports for this user were resolved.'))
                .catch((error: unknown) => {
                  appAlert('Resolve failed', resolveUserReportErrorMessage(error));
                });
            },
          },
        ],
      );
    },
    [appAlert, resolveAllReports],
  );

  const handleBan = useCallback(
    (userId: string, displayName: string): void => {
      appAlert('Ban user', `Ban ${displayName} from the platform?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: () => {
            void banAuthor
              .mutateAsync({ userId, banned: true })
              .then(() =>
                appAlert('Banned', BAN_SUCCESS_MESSAGE, [
                  { text: 'OK', style: 'cancel' },
                  {
                    text: 'View banned users',
                    onPress: () => router.push(buildModerationBannedUsersRoute()),
                  },
                ]),
              )
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'Could not ban user.';
                appAlert('Ban failed', message);
              });
          },
        },
      ]);
    },
    [appAlert, banAuthor, router],
  );

  const handleUnban = useCallback(
    (userId: string, displayName: string): void => {
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
                .then(() =>
                  appAlert('Unbanned', `${displayName} can use the platform again.`),
                )
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : 'Could not unban user.';
                  appAlert('Unban failed', message);
                });
            },
          },
        ],
      );
    },
    [appAlert, banAuthor],
  );

  const renderItem = useCallback(
    ({ item }: { item: GroupedUserReports }) => (
      <GroupCard
        group={item}
        onResolve={handleResolve}
        onResolveAll={handleResolveAll}
        onBan={handleBan}
        onUnban={handleUnban}
        isBanPending={banAuthor.isPending}
        isResolveAllPending={resolveAllReports.isPending}
        resolvingReportId={resolveReport.isPending ? (resolveReport.variables ?? null) : null}
      />
    ),
    [
      banAuthor.isPending,
      handleBan,
      handleResolve,
      handleResolveAll,
      handleUnban,
      resolveAllReports.isPending,
      resolveReport.isPending,
      resolveReport.variables,
    ],
  );

  const keyExtractor = useCallback((item: GroupedUserReports) => item.reportedId, []);

  const listHeader = useMemo(
    () => (
      <View className="px-5 pb-5">
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Ionicons name="chevron-back" size={20} color={C.mist} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1 mt-4">
          MODERATION
        </Text>
        <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={{ letterSpacing: -0.8 }}>
          User reports
        </Text>
        <Text className="font-grotesk text-sm text-neutral/55 mt-2">
          Open abuse reports grouped by reported user, sorted by report count.
        </Text>
        <Pressable
          onPress={() => router.push(buildModerationBannedUsersRoute())}
          style={styles.manageBansLink}
        >
          <Text style={styles.manageBansLinkText}>Manage banned users</Text>
        </Pressable>
      </View>
    ),
    [router],
  );

  const listEmpty = useMemo(() => {
    if (reportsQuery.isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.mist} />
        </View>
      );
    }
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyText}>No open user reports.</Text>
      </View>
    );
  }, [reportsQuery.isLoading]);

  if (contactGate.isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={C.mist} />
      </View>
    );
  }

  if (!isModerator) {
    return (
      <View style={[styles.root, { paddingTop: contentTopPadding }]}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Ionicons name="chevron-back" size={20} color={C.mist} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>Moderator access required.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        contentContainerStyle={{ paddingTop: contentTopPadding, paddingBottom: insets.bottom + 24 }}
        data={groupedReports}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={reportsQuery.isRefetching}
            onRefresh={() => void reportsQuery.refetch()}
            tintColor={C.mist}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    fontWeight: '600',
  },
  manageBansLink: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  manageBansLinkText: {
    color: '#5E70B8',
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
  },
  emptyText: {
    color: C.faint,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.surface1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 18,
    fontWeight: '800',
  },
  reportChip: {
    color: C.warning,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bannedChip: {
    color: C.danger,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportCard: {
    borderTopWidth: 1,
    borderTopColor: C.hair,
    paddingTop: 12,
    gap: 6,
  },
  reportReason: {
    color: C.mist,
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
  },
  reportMeta: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
  },
  reportComment: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 19,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextLink: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(228,228,228,0.06)',
  },
  contextLinkText: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  resolveAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(91,224,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91,224,166,0.25)',
  },
  resolveActionText: {
    color: C.success,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '700',
  },
  resolveAllAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(91,224,166,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(91,224,166,0.18)',
  },
  resolveAllActionText: {
    color: C.success,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '700',
  },
  banAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(224,123,123,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,123,123,0.25)',
  },
  banActionText: {
    color: C.danger,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '700',
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
});
