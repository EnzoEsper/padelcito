import { useMemo } from 'react';
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import {
  FLYER_REPORT_REASON_LABELS,
  FLYER_STATUS_LABELS,
  FLYER_TYPE_LABELS,
  formatFlyerDistanceKm,
  formatFlyerEventSchedule,
  isFlyerContactVerified,
} from '@/features/community/flyer-display';
import { buildFlyerWhatsAppUrl } from '@/features/community/flyer-whatsapp';
import {
  useArchiveFlyer,
  useFlyerDetail,
  useReportFlyer,
} from '@/features/community/use-flyers';
import { buildFlyerImageUrl } from '@/lib/flyer-storage';
import type { Database } from '@/types/database';

type FlyerReportReason = Database['public']['Enums']['flyer_report_reason'];

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

const REPORT_REASONS: FlyerReportReason[] = [
  'spam',
  'inappropriate',
  'scam',
  'misleading',
  'other',
];

export default function FlyerDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const flyerId = useMemo(() => {
    const raw = params.id;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  }, [params.id]);

  const detailQuery = useFlyerDetail(flyerId);
  const reportFlyer = useReportFlyer();
  const archiveFlyer = useArchiveFlyer();
  const flyer = detailQuery.data;

  const imageUrl = flyer !== undefined ? buildFlyerImageUrl(flyer.image_path) : null;
  const headerTop = insets.top + 16;

  async function openWhatsApp(): Promise<void> {
    if (flyer === undefined || flyer.status !== 'approved') return;
    const url = buildFlyerWhatsAppUrl(flyer.contact_phone, flyer);
    await Linking.openURL(url);
  }

  function handleReport(): void {
    if (flyer === undefined || flyer.isAuthor) return;

    appAlert('Report flyer', 'Why are you reporting this flyer?', [
      ...REPORT_REASONS.map((reason) => ({
        text: FLYER_REPORT_REASON_LABELS[reason],
        onPress: () => {
          void reportFlyer
            .mutateAsync({ flyerId: flyer.id, reason })
            .then(() => {
              appAlert('Report submitted', 'Thanks — moderators will review this flyer.');
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
    if (flyer === undefined) return;
    appAlert('Archive flyer', 'This removes the flyer from the public feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          void archiveFlyer
            .mutateAsync(flyer.id)
            .then(() => router.back())
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Could not archive flyer.';
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

      {detailQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.mist} />
        </View>
      ) : detailQuery.isError || flyer === undefined ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Could not load flyer.'}
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
              {FLYER_TYPE_LABELS[flyer.type].toUpperCase()}
            </Text>
          </View>

          <Text className="font-grotesk font-extrabold text-[30px] text-neutral px-5" style={{ letterSpacing: -0.8 }}>
            {flyer.title}
          </Text>

          {flyer.status !== 'approved' ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerTitle}>{FLYER_STATUS_LABELS[flyer.status]}</Text>
              {flyer.rejection_reason !== null ? (
                <Text style={styles.statusBannerText}>{flyer.rejection_reason}</Text>
              ) : null}
            </View>
          ) : null}

          {imageUrl !== null ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>When</Text>
            <Text style={styles.sectionValue}>
              {formatFlyerEventSchedule(flyer.event_start, flyer.event_end)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where</Text>
            <Text style={styles.sectionValue}>
              {flyer.venue_name ?? flyer.formatted_address ?? 'See flyer image'}
            </Text>
            {flyer.formatted_address !== null && flyer.venue_name !== null ? (
              <Text style={styles.sectionHint}>{flyer.formatted_address}</Text>
            ) : null}
            {flyer.distanceM !== undefined ? (
              <Text style={styles.sectionHint}>{formatFlyerDistanceKm(flyer.distanceM)} away</Text>
            ) : null}
          </View>

          {flyer.description !== null && flyer.description.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Details</Text>
              <Text style={styles.sectionBody}>{flyer.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Organizer</Text>
            <Text style={styles.sectionValue}>{flyer.author?.display_name ?? 'Player'}</Text>
            {isFlyerContactVerified(flyer.contact_verified_at) ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={14} color={C.success} />
                <Text style={styles.verifiedText}>Verified contact</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {flyer !== undefined ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {flyer.status === 'approved' && !flyer.isAuthor ? (
            <Pressable onPress={handleReport} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Report flyer</Text>
            </Pressable>
          ) : null}

          {flyer.status === 'approved' ? (
            <Pressable onPress={() => void openWhatsApp()} style={styles.primaryButton}>
              <Ionicons name="logo-whatsapp" size={18} color={C.mist} />
              <Text style={styles.primaryButtonText}>Contact on WhatsApp</Text>
            </Pressable>
          ) : null}

          {flyer.isAuthor && flyer.status === 'approved' ? (
            <Pressable onPress={handleArchive} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Archive flyer</Text>
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
