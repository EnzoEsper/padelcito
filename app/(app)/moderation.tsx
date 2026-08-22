import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, Pressable, View, Text, TextInput } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import {
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
  buildPostDetailRoute,
  formatPostEventSchedule,
} from '@/features/community/post-display';
import {
  useBanPostAuthor,
  useModeratePost,
  useModerationQueue,
  useProfileContactGate,
} from '@/features/community/use-posts';
import { CachedRemoteImage } from '@/components/cached-remote-image';
import { buildPostImageUrl } from '@/lib/post-storage';
import type { PostSummary } from '@/features/community/use-posts';

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

type ModerationCardProps = {
  post: PostSummary;
  isRejecting: boolean;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBan: () => void;
  onPreview: () => void;
};

function ModerationCard({
  post,
  isRejecting,
  rejectReason,
  onRejectReasonChange,
  onStartReject,
  onCancelReject,
  onApprove,
  onReject,
  onBan,
  onPreview,
}: ModerationCardProps) {
  const imageUrl = buildPostImageUrl(post.image_path);

  return (
    <View style={styles.card}>
      {imageUrl !== null ? (
        <CachedRemoteImage uri={imageUrl} style={styles.cardImage} contentFit="cover" />
      ) : null}

      <View style={styles.cardBody}>
        <View style={styles.cardMetaRow}>
          <Text style={styles.typeChip}>{POST_TYPE_LABELS[post.type]}</Text>
          <Text style={styles.statusChip}>{POST_STATUS_LABELS[post.status]}</Text>
          {post.report_count > 0 ? (
            <Text style={styles.reportChip}>{post.report_count} reports</Text>
          ) : null}
        </View>

        <Text style={styles.cardTitle}>{post.title}</Text>
        <Text style={styles.cardSub}>
          {formatPostEventSchedule(post.event_start, post.event_end)}
        </Text>
        <Text style={styles.cardSub}>
          {post.venue_name ?? post.formatted_address ?? 'No venue label'}
        </Text>
        <Text style={styles.cardSub}>By {post.author?.display_name ?? 'Player'}</Text>

        <Pressable onPress={onPreview}>
          <Text style={styles.previewLink}>Open preview</Text>
        </Pressable>

        {isRejecting ? (
          <View style={styles.rejectBox}>
            <TextInput
              value={rejectReason}
              onChangeText={onRejectReasonChange}
              placeholder="Reason for rejection"
              placeholderTextColor={C.faint}
              multiline
              style={styles.rejectInput}
            />
            <View style={styles.actionRow}>
              <Pressable onPress={onCancelReject} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onReject} style={styles.rejectAction}>
                <Text style={styles.rejectActionText}>Confirm reject</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable onPress={onApprove} style={styles.approveAction}>
              <Text style={styles.approveActionText}>Approve</Text>
            </Pressable>
            <Pressable onPress={onStartReject} style={styles.rejectAction}>
              <Text style={styles.rejectActionText}>Reject</Text>
            </Pressable>
            <Pressable onPress={onBan} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Ban</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ModerationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const contactGate = useProfileContactGate();
  const queueQuery = useModerationQueue();
  const moderatePost = useModeratePost();
  const banAuthor = useBanPostAuthor();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isModerator = contactGate.data?.isModerator === true;
  const posts = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => b.report_count - a.report_count || a.created_at.localeCompare(b.created_at),
      ),
    [posts],
  );

  const handleApprove = useCallback(
    async (postId: string): Promise<void> => {
      try {
        await moderatePost.mutateAsync({ postId, status: 'approved' });
        appAlert('Approved', 'The post is now public.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not approve post.';
        appAlert('Approve failed', message);
      }
    },
    [appAlert, moderatePost],
  );

  const handleReject = useCallback(
    async (postId: string): Promise<void> => {
      const reason = rejectReason.trim();
      if (reason.length === 0) {
        appAlert('Reason required', 'Add a short rejection reason for the author.');
        return;
      }

      try {
        await moderatePost.mutateAsync({
          postId,
          status: 'rejected',
          rejectionReason: reason,
        });
        setRejectingId(null);
        setRejectReason('');
        appAlert('Rejected', 'The author was notified.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not reject post.';
        appAlert('Reject failed', message);
      }
    },
    [appAlert, moderatePost, rejectReason],
  );

  const handleBan = useCallback(
    (authorId: string, authorName: string): void => {
      appAlert('Ban author', `Ban ${authorName} from publishing posts?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: () => {
            void banAuthor
              .mutateAsync({ userId: authorId, banned: true })
              .then(() => appAlert('Banned', 'The author can no longer publish posts.'))
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
    ({ item }: { item: PostSummary }) => (
      <ModerationCard
        post={item}
        isRejecting={rejectingId === item.id}
        rejectReason={rejectingId === item.id ? rejectReason : ''}
        onRejectReasonChange={setRejectReason}
        onStartReject={() => {
          setRejectingId(item.id);
          setRejectReason('');
        }}
        onCancelReject={() => {
          setRejectingId(null);
          setRejectReason('');
        }}
        onApprove={() => void handleApprove(item.id)}
        onReject={() => void handleReject(item.id)}
        onBan={() => handleBan(item.author_id, item.author?.display_name ?? 'author')}
        onPreview={() => router.push(buildPostDetailRoute(item.id))}
      />
    ),
    [handleApprove, handleBan, handleReject, rejectReason, rejectingId, router],
  );

  const keyExtractor = useCallback((item: PostSummary) => item.id, []);

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
          Review queue
        </Text>
        <Text className="font-grotesk text-sm text-neutral/55 mt-2">
          Sorted by reports, then oldest pending submissions.
        </Text>
      </View>
    ),
    [router],
  );

  const listEmpty = useMemo(() => {
    if (queueQuery.isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.mist} />
        </View>
      );
    }
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyText}>No posts waiting for review.</Text>
      </View>
    );
  }, [queueQuery.isLoading]);

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
        data={sortedPosts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={queueQuery.isRefetching}
            onRefresh={() => void queueQuery.refetch()}
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
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#1B1C21',
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
