import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text, TextInput } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import {
  FLYER_STATUS_LABELS,
  FLYER_TYPE_LABELS,
  buildFlyerDetailRoute,
  formatFlyerEventSchedule,
} from '@/features/community/flyer-display';
import {
  useBanFlyerAuthor,
  useModerateFlyer,
  useModerationQueue,
  useProfileContactGate,
} from '@/features/community/use-flyers';
import { buildFlyerImageUrl } from '@/lib/flyer-storage';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  warning: '#E0B15B',
  success: '#5BE0A6',
} as const;

export default function ModerationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const contactGate = useProfileContactGate();
  const queueQuery = useModerationQueue();
  const moderateFlyer = useModerateFlyer();
  const banAuthor = useBanFlyerAuthor();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isModerator = contactGate.data?.isModerator === true;
  const flyers = queueQuery.data ?? [];

  const sortedFlyers = useMemo(
    () => [...flyers].sort((a, b) => b.report_count - a.report_count || a.created_at.localeCompare(b.created_at)),
    [flyers],
  );

  async function handleApprove(flyerId: string): Promise<void> {
    try {
      await moderateFlyer.mutateAsync({ flyerId, status: 'approved' });
      appAlert('Approved', 'The flyer is now public.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not approve flyer.';
      appAlert('Approve failed', message);
    }
  }

  async function handleReject(flyerId: string): Promise<void> {
    const reason = rejectReason.trim();
    if (reason.length === 0) {
      appAlert('Reason required', 'Add a short rejection reason for the author.');
      return;
    }

    try {
      await moderateFlyer.mutateAsync({
        flyerId,
        status: 'rejected',
        rejectionReason: reason,
      });
      setRejectingId(null);
      setRejectReason('');
      appAlert('Rejected', 'The author was notified.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not reject flyer.';
      appAlert('Reject failed', message);
    }
  }

  function handleBan(authorId: string, authorName: string): void {
    appAlert('Ban author', `Ban ${authorName} from publishing flyers?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Ban',
        style: 'destructive',
        onPress: () => {
          void banAuthor
            .mutateAsync({ userId: authorId, banned: true })
            .then(() => appAlert('Banned', 'The author can no longer publish flyers.'))
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Could not ban user.';
              appAlert('Ban failed', message);
            });
        },
      },
    ]);
  }

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
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={queueQuery.isRefetching}
            onRefresh={() => void queueQuery.refetch()}
            tintColor={C.mist}
          />
        }
      >
        <View className="px-5 pb-5">
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="chevron-back" size={20} color={C.mist} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1 mt-4">
            MODERATION
          </Text>
          <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={{ letterSpacing: -0.8 }}>
            Review queue
          </Text>
          <Text className="font-grotesk text-sm text-neutral/55 mt-2">
            Sorted by reports, then oldest pending submissions.
          </Text>
        </View>

        {queueQuery.isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={C.mist} />
          </View>
        ) : sortedFlyers.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyText}>No flyers waiting for review.</Text>
          </View>
        ) : (
          sortedFlyers.map((flyer) => {
            const imageUrl = buildFlyerImageUrl(flyer.image_path);
            const isRejecting = rejectingId === flyer.id;

            return (
              <View key={flyer.id} style={styles.card}>
                {imageUrl !== null ? (
                  <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : null}

                <View style={styles.cardBody}>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.typeChip}>{FLYER_TYPE_LABELS[flyer.type]}</Text>
                    <Text style={styles.statusChip}>{FLYER_STATUS_LABELS[flyer.status]}</Text>
                    {flyer.report_count > 0 ? (
                      <Text style={styles.reportChip}>{flyer.report_count} reports</Text>
                    ) : null}
                  </View>

                  <Text style={styles.cardTitle}>{flyer.title}</Text>
                  <Text style={styles.cardSub}>
                    {formatFlyerEventSchedule(flyer.event_start, flyer.event_end)}
                  </Text>
                  <Text style={styles.cardSub}>
                    {flyer.venue_name ?? flyer.formatted_address ?? 'No venue label'}
                  </Text>
                  <Text style={styles.cardSub}>
                    By {flyer.author?.display_name ?? 'Player'}
                  </Text>

                  <Pressable onPress={() => router.push(buildFlyerDetailRoute(flyer.id))}>
                    <Text style={styles.previewLink}>Open preview</Text>
                  </Pressable>

                  {isRejecting ? (
                    <View style={styles.rejectBox}>
                      <TextInput
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        placeholder="Reason for rejection"
                        placeholderTextColor={C.faint}
                        multiline
                        style={styles.rejectInput}
                      />
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          style={styles.secondaryAction}
                        >
                          <Text style={styles.secondaryActionText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleReject(flyer.id)}
                          style={styles.rejectAction}
                        >
                          <Text style={styles.rejectActionText}>Confirm reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => void handleApprove(flyer.id)}
                        style={styles.approveAction}
                      >
                        <Text style={styles.approveActionText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setRejectingId(flyer.id);
                          setRejectReason('');
                        }}
                        style={styles.rejectAction}
                      >
                        <Text style={styles.rejectActionText}>Reject</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          handleBan(flyer.author_id, flyer.author?.display_name ?? 'author')
                        }
                        style={styles.secondaryAction}
                      >
                        <Text style={styles.secondaryActionText}>Ban</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    color: '#5E70B8',
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusChip: {
    color: C.warning,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reportChip: {
    color: C.warning,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 18,
    fontWeight: '800',
  },
  cardSub: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
  },
  previewLink: {
    color: '#5E70B8',
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  approveAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(91,224,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91,224,166,0.25)',
  },
  approveActionText: {
    color: C.success,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(224,177,91,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.25)',
  },
  rejectActionText: {
    color: C.warning,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
  },
  secondaryActionText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectBox: {
    gap: 8,
    marginTop: 4,
  },
  rejectInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
    padding: 12,
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
