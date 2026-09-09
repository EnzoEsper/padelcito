import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, Pressable, View, Text } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import { useBanPostAuthor } from '@/features/community/use-posts';
import { useProfileContactGate } from '@/features/community/use-posts';
import {
  USER_REPORT_REASON_LABELS,
} from '@/features/safety/safety-display';
import {
  groupOpenUserReports,
  resolveUserReportErrorMessage,
  useOpenUserReports,
  useResolveUserReport,
  type GroupedUserReports,
  type UserReportSummary,
} from '@/features/safety/use-user-reports';

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

function ReportCard({
  report,
  onResolve,
  onBan,
}: {
  report: UserReportSummary;
  onResolve: () => void;
  onBan: () => void;
}) {
  return (
    <View style={styles.reportCard}>
      <Text style={styles.reportReason}>{USER_REPORT_REASON_LABELS[report.reason]}</Text>
      <Text style={styles.reportMeta}>
        Reported by {report.reporter?.display_name ?? 'Player'}
      </Text>
      {report.comment !== null && report.comment.length > 0 ? (
        <Text style={styles.reportComment}>{report.comment}</Text>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable onPress={onResolve} style={styles.resolveAction}>
          <Text style={styles.resolveActionText}>Resolve</Text>
        </Pressable>
        <Pressable onPress={onBan} style={styles.banAction}>
          <Text style={styles.banActionText}>Ban user</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GroupCard({
  group,
  onResolve,
  onBan,
}: {
  group: GroupedUserReports;
  onResolve: (reportId: string) => void;
  onBan: (userId: string, displayName: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{group.reportedName}</Text>
        <Text style={styles.reportChip}>
          {group.reports.length} open report{group.reports.length === 1 ? '' : 's'}
        </Text>
      </View>
      {group.reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onResolve={() => onResolve(report.id)}
          onBan={() => onBan(group.reportedId, group.reportedName)}
        />
      ))}
    </View>
  );
}

export default function UserReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const contactGate = useProfileContactGate();
  const reportsQuery = useOpenUserReports({
    enabled: contactGate.data?.isModerator === true,
  });
  const resolveReport = useResolveUserReport();
  const banAuthor = useBanPostAuthor();

  const isModerator = contactGate.data?.isModerator === true;
  const groupedReports = useMemo(
    () => groupOpenUserReports(reportsQuery.data ?? []),
    [reportsQuery.data],
  );

  const handleResolve = useCallback(
    async (reportId: string): Promise<void> => {
      try {
        await resolveReport.mutateAsync(reportId);
        appAlert('Resolved', 'The report was marked as resolved.');
      } catch (error) {
        appAlert('Resolve failed', resolveUserReportErrorMessage(error));
      }
    },
    [appAlert, resolveReport],
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
              .then(() => appAlert('Banned', 'The user can no longer use the app.'))
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'Could not ban user.';
                appAlert('Ban failed', message);
              });
          },
        },
      ]);
    },
    [appAlert, banAuthor],
  );

  const renderItem = useCallback(
    ({ item }: { item: GroupedUserReports }) => (
      <GroupCard
        group={item}
        onResolve={(reportId) => void handleResolve(reportId)}
        onBan={handleBan}
      />
    ),
    [handleBan, handleResolve],
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
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
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
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
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
});
