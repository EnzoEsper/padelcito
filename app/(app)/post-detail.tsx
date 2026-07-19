import { useMemo } from 'react';
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import {
  POST_REPORT_REASON_LABELS,
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
  formatPostDistanceKm,
  formatPostEventSchedule,
  isPostContactVerified,
} from '@/features/community/post-display';
import { buildPostWhatsAppUrl } from '@/features/community/post-whatsapp';
import {
  useArchivePost,
  usePostDetail,
  useReportPost,
} from '@/features/community/use-posts';
import { usePostRealtime } from '@/features/community/use-post-realtime';
import { buildPostImageUrl } from '@/lib/post-storage';
import type { Database } from '@/types/database';

type CommunityPostReportReason = Database['public']['Enums']['community_post_report_reason'];

const SCREEN_PADDING = 20;
const HEADER_BUTTON_SIZE = 44;
const HEADER_TEXT_INSET = HEADER_BUTTON_SIZE + 12;

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  success: '#5BE0A6',
  warning: '#E0B15B',
} as const;

const REPORT_REASONS: CommunityPostReportReason[] = [
  'spam',
  'inappropriate',
  'scam',
  'misleading',
  'other',
];

export default function PostDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = useMemo(() => {
    const raw = params.id;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  }, [params.id]);

  const detailQuery = usePostDetail(postId);
  usePostRealtime(postId);
  const reportPost = useReportPost();
  const archivePost = useArchivePost();
  const post = detailQuery.data;
  const isLoadingPost =
    detailQuery.isPending || (detailQuery.isFetching && post === undefined);

  const imageUrl = post !== undefined ? buildPostImageUrl(post.image_path) : null;
  const headerTop = insets.top + 16;

  async function openWhatsApp(): Promise<void> {
    if (post === undefined || post.status !== 'approved') return;
    const url = buildPostWhatsAppUrl(post.contact_phone, post);
    await Linking.openURL(url);
  }

  function handleReport(): void {
    if (post === undefined || post.isAuthor) return;

    appAlert('Report post', 'Why are you reporting this post?', [
      ...REPORT_REASONS.map((reason) => ({
        text: POST_REPORT_REASON_LABELS[reason],
        onPress: () => {
          void reportPost
            .mutateAsync({ postId: post.id, reason })
            .then(() => {
              appAlert('Report submitted', 'Thanks — moderators will review this post.');
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Could not submit report.';
              appAlert('Report failed', message);
            });
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function handleArchive(): void {
    if (post === undefined) return;
    appAlert('Archive post', 'This removes the post from the public feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          void archivePost
            .mutateAsync(post.id)
            .then(() => router.back())
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Could not archive post.';
              appAlert('Archive failed', message);
            });
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: headerTop, left: SCREEN_PADDING }]}
        className="rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color={C.mist} />
      </Pressable>

      {isLoadingPost ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.mist} />
        </View>
      ) : detailQuery.isError || post === undefined ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Could not load post.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerTop,
            paddingBottom: insets.bottom + 120,
          }}
          refreshControl={
            <RefreshControl
              refreshing={detailQuery.isRefetching}
              onRefresh={() => void detailQuery.refetch()}
              tintColor={C.mist}
            />
          }
        >
          <View style={styles.headerMetaRow}>
            <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
              {POST_TYPE_LABELS[post.type].toUpperCase()}
            </Text>
          </View>

          <Text className="font-grotesk font-extrabold text-[30px] text-neutral px-5" style={{ letterSpacing: -0.8 }}>
            {post.title}
          </Text>

          {post.status !== 'approved' ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerTitle}>{POST_STATUS_LABELS[post.status]}</Text>
              {post.rejection_reason !== null ? (
                <Text style={styles.statusBannerText}>{post.rejection_reason}</Text>
              ) : null}
            </View>
          ) : null}

          {imageUrl !== null ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>When</Text>
            <Text style={styles.sectionValue}>
              {formatPostEventSchedule(post.event_start, post.event_end)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where</Text>
            <Text style={styles.sectionValue}>
              {post.venue_name ?? post.formatted_address ?? 'See post image'}
            </Text>
            {post.formatted_address !== null && post.venue_name !== null ? (
              <Text style={styles.sectionHint}>{post.formatted_address}</Text>
            ) : null}
            {post.distanceM !== undefined ? (
              <Text style={styles.sectionHint}>{formatPostDistanceKm(post.distanceM)} away</Text>
            ) : null}
          </View>

          {post.description !== null && post.description.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Details</Text>
              <Text style={styles.sectionBody}>{post.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Organizer</Text>
            <Text style={styles.sectionValue}>{post.author?.display_name ?? 'Player'}</Text>
            {isPostContactVerified(post.contact_verified_at) ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={14} color={C.success} />
                <Text style={styles.verifiedText}>Verified contact</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {post !== undefined ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {post.status === 'approved' && !post.isAuthor ? (
            <Pressable onPress={handleReport} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Report post</Text>
            </Pressable>
          ) : null}

          {post.status === 'approved' ? (
            <Pressable onPress={() => void openWhatsApp()} style={styles.primaryButton}>
              <Ionicons name="logo-whatsapp" size={18} color={C.mist} />
              <Text style={styles.primaryButtonText}>Contact on WhatsApp</Text>
            </Pressable>
          ) : null}

          {post.isAuthor && post.status === 'approved' ? (
            <Pressable onPress={handleArchive} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Archive post</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
  },
  headerMetaRow: {
    height: HEADER_BUTTON_SIZE,
    justifyContent: 'center',
    paddingLeft: SCREEN_PADDING + HEADER_TEXT_INSET,
    marginBottom: 4,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    textAlign: 'center',
  },
  statusBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.25)',
    backgroundColor: 'rgba(224,177,91,0.08)',
    gap: 4,
  },
  statusBannerTitle: {
    color: C.warning,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusBannerText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
  },
  heroImage: {
    width: '100%',
    height: 280,
    marginTop: 16,
    backgroundColor: C.surface1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 6,
  },
  sectionLabel: {
    color: C.faint,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionValue: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHint: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
  },
  sectionBody: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    lineHeight: 22,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  verifiedText: {
    color: C.success,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    backgroundColor: 'rgba(11,11,11,0.94)',
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#2B396D',
    borderWidth: 1,
    borderColor: '#5E70B8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface1,
  },
  secondaryButtonText: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    fontWeight: '600',
  },
});
