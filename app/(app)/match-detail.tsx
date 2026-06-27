import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, View, Text, Pressable } from '@/tw';
import { useDiscoverLocation } from '@/features/discover/use-discover-location';
import {
  canHostCancelMatch,
  canHostEditRoster,
  canHostManageRoster,
  canPlayerWithdraw,
  useCancelMatch,
  useCancelPendingRequest,
  useMatchContacts,
  useMatchDetail,
  useRequestToJoin,
  useUpdateParticipantStatus,
  type MatchDetail,
} from '@/features/matches/use-matches';
import { useMatchRealtime } from '@/features/matches/use-match-realtime';
import { useMatchScheduleClock } from '@/features/matches/use-match-schedule-clock';
import { buildRateMatchRoute } from '@/features/ratings/rating-display';
import { useRatableMatch } from '@/features/ratings/use-ratings';
import { CourtsInfoChip } from '@/features/matches/courts-info-sheet';
import {
  buildMatchMetaChips,
  formatCategoryCompact,
  formatDifficultyLabel,
  formatDistanceKm,
  formatMatchPriceArs,
  formatProfileRating,
  formatWithdrawalThreshold,
  hasHostNote,
  resolveMatchCourtConfigs,
  resolveMatchDistanceM,
  resolveMatchStatusBadge,
  type MatchMetaChipEmphasis,
  type MatchStatusBadgeTone,
} from '@/features/matches/match-display';
import { formatPublicReliabilityScore } from '@/features/ratings/penalty-report';
import { RosterInfoButton, RosterInfoSheet } from '@/features/matches/roster-info-sheet';
import type { CourtConfig } from '@/lib/padel-court';
import { formatMatchScheduleLabel } from '@/lib/match-time';
import { resolveMatchLocationSubtitle } from '@/lib/match-location';
import { UnsupportedSportError } from '@/lib/padel-sport';
import type { Database } from '@/types/database';

type PublicProfile = Database['public']['Views']['public_profiles']['Row'];
type ContactRow = Database['public']['Functions']['match_contact_details']['Returns'][number];
type MatchStatus = Database['public']['Enums']['match_status'];

async function openContactForProfile(
  contacts: ContactRow[] | undefined,
  profileId: string,
): Promise<void> {
  const contact = contacts?.find((row) => row.profile_id === profileId);
  const link = contact?.whatsapp_link;
  if (link === undefined || link === null) {
    Alert.alert('No WhatsApp link', 'This player has not added a WhatsApp number yet.');
    return;
  }
  await Linking.openURL(link);
}

const SCREEN_PADDING = 20;
const HEADER_BUTTON_SIZE = 44;
/** Header button width + gap — eyebrow sits beside the floating control. */
const HEADER_TEXT_INSET = HEADER_BUTTON_SIZE + 12;

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface2: '#1B1C21',
  surface3: '#232429',
  blue: '#2B396D',
  blueHi: '#5E70B8',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  ghost: 'rgba(228,228,228,0.20)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  success: '#5BE0A6',
  warning: '#E0B15B',
} as const;

const STATUS_BADGE_TONE_STYLES: Record<
  MatchStatusBadgeTone,
  {
    container: { backgroundColor: string; borderColor: string };
    text: { color: string };
    showDot?: boolean;
  }
> = {
  open: {
    container: {
      backgroundColor: 'rgba(91,224,166,0.10)',
      borderColor: 'rgba(91,224,166,0.30)',
    },
    text: { color: C.success },
  },
  full: {
    container: {
      backgroundColor: 'rgba(68,88,166,0.18)',
      borderColor: 'rgba(94,112,184,0.35)',
    },
    text: { color: C.blueHi },
  },
  live: {
    container: {
      backgroundColor: 'rgba(91,224,166,0.10)',
      borderColor: 'rgba(91,224,166,0.35)',
    },
    text: { color: C.success },
    showDot: true,
  },
  finished: {
    container: {
      backgroundColor: C.surface3,
      borderColor: C.hair,
    },
    text: { color: C.dim },
  },
  cancelled: {
    container: {
      backgroundColor: 'rgba(228,228,228,0.08)',
      borderColor: 'rgba(228,228,228,0.20)',
    },
    text: { color: C.dim },
  },
};

const AVATAR_TONES: [string, string][] = [
  ['#4458A6', '#E4E4E4'],
  ['#263665', '#E4E4E4'],
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#0B0B0B'],
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const badge = resolveMatchStatusBadge(status);
  const tone = STATUS_BADGE_TONE_STYLES[badge.tone];

  return (
    <View style={[styles.statusBadge, tone.container]}>
      {tone.showDot === true ? <View style={styles.statusBadgeDot} /> : null}
      <Text style={[styles.statusBadgeText, tone.text]}>{badge.label}</Text>
    </View>
  );
}

function MetaChip({ label, emphasis }: { label: string; emphasis: MatchMetaChipEmphasis }) {
  return (
    <View
      style={[
        styles.metaChip,
        emphasis === 'primary' && styles.metaChipPrimary,
        emphasis === 'secondary' && styles.metaChipSecondary,
        emphasis === 'default' && styles.metaChipDefault,
      ]}
    >
      <Text
        style={[
          styles.metaChipText,
          emphasis === 'primary' && styles.metaChipTextPrimary,
          emphasis === 'secondary' && styles.metaChipTextSecondary,
          emphasis === 'default' && styles.metaChipTextDefault,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function MatchDetailChips({
  match,
  courtConfigs,
}: {
  match: MatchDetail;
  courtConfigs: CourtConfig[];
}) {
  const chips = buildMatchMetaChips(match);
  return (
    <View style={styles.preferenceRow}>
      <CourtsInfoChip courtCount={match.court_count} configs={courtConfigs} />
      {chips.map((chip) => (
        <MetaChip key={chip.key} label={chip.label} emphasis={chip.emphasis} />
      ))}
    </View>
  );
}

function FloatingHeaderButton({
  icon,
  onPress,
  accessibilityLabel,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  style: { top: number; left?: number; right?: number };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.headerButton, style]}
      className="rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Ionicons name={icon} size={22} color={C.mist} />
    </Pressable>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {sub !== undefined ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Avatar({ name, index }: { name: string; index: number }) {
  const tone = AVATAR_TONES[index % AVATAR_TONES.length] ?? AVATAR_TONES[0];
  return (
    <View style={[styles.avatar, { backgroundColor: tone[0] }]}>
      <Text style={[styles.avatarText, { color: tone[1] }]}>{initials(name)}</Text>
    </View>
  );
}

function PlayerRow({
  name,
  index,
  host = false,
  you = false,
  ratingLabel,
  reliabilityLabel,
  onRemove,
  onWhatsApp,
}: {
  name: string;
  index: number;
  host?: boolean;
  you?: boolean;
  ratingLabel: string | null;
  reliabilityLabel?: string | null;
  onRemove?: () => void;
  onWhatsApp?: () => void;
}) {
  return (
    <View style={styles.playerRow}>
      <Avatar name={name} index={index} />
      <View style={styles.playerInfo}>
        <View style={styles.playerNameRow}>
          <Text style={styles.playerName} numberOfLines={1}>
            {name}{you ? ' (You)' : ''}
          </Text>
          {host ? (
            <View style={styles.hostPill}>
              <Text style={styles.hostPillText}>Host</Text>
            </View>
          ) : null}
        </View>
        {ratingLabel !== null || reliabilityLabel !== null ? (
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.blueHi} />
            <Text style={styles.trustText}>
              {[ratingLabel, reliabilityLabel].filter((value) => value !== null).join(' · ')}
            </Text>
          </View>
        ) : null}
      </View>
      {onWhatsApp !== undefined || onRemove !== undefined ? (
        <View style={styles.playerActions}>
          {onWhatsApp !== undefined ? (
            <Pressable
              onPress={onWhatsApp}
              style={styles.rosterWhatsAppButton}
              accessibilityLabel="Message on WhatsApp"
            >
              <Ionicons name="chatbox-outline" size={16} color={C.mist} />
            </Pressable>
          ) : null}
          {onRemove !== undefined ? (
            <Pressable onPress={onRemove} style={styles.removeButton}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SectionHeader({
  title,
  right,
  trailingAction,
}: {
  title: string;
  right?: string;
  trailingAction?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleGroup}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {trailingAction}
      </View>
      {right !== undefined ? <Text style={styles.sectionRight}>{right}</Text> : null}
    </View>
  );
}

function OfflineConfirmedSummary({
  count,
  onInfoPress,
}: {
  count: number;
  onInfoPress: () => void;
}) {
  const visibleDots = Math.min(count, 3);
  const overflow = count - visibleDots;

  return (
    <View style={styles.offlineSummaryRow}>
      <View style={styles.offlineDotStack}>
        {Array.from({ length: visibleDots }).map((_, index) => (
          <View
            key={`offline-dot-${index}`}
            style={[styles.offlineDot, index > 0 ? styles.offlineDotOverlap : null]}
          />
        ))}
        {overflow > 0 ? (
          <View style={[styles.offlineDotOverflow, styles.offlineDotOverlap]}>
            <Text style={styles.offlineDotOverflowText}>+{overflow}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.offlineSummaryCopy}>
        <Text style={styles.offlineSummaryTitle}>
          {count === 1 ? '1 player confirmed' : `${count} players confirmed`}
        </Text>
        <Text style={styles.offlineSummaryHint}>Outside the app</Text>
      </View>
      <RosterInfoButton onPress={onInfoPress} />
    </View>
  );
}

function OpenSpots({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.openSpotsRow}>
      <View style={styles.emptyAvatar}>
        <Ionicons name="add" size={18} color={C.dim} />
      </View>
      <Text style={styles.openSpotsText}>
        {count} spot{count === 1 ? '' : 's'} open
      </Text>
    </View>
  );
}

function FooterAction({
  match,
  scheduleNow,
  isBusy,
  onRequest,
  onCancelRequest,
  onWithdraw,
  onMessageHost,
  onCancelMatch,
  needsRating,
  onRatePlayers,
}: {
  match: MatchDetail;
  scheduleNow: number;
  isBusy: boolean;
  onRequest: () => void;
  onCancelRequest: () => void;
  onWithdraw: () => void;
  onMessageHost: () => void;
  onCancelMatch: () => void;
  needsRating: boolean;
  onRatePlayers: () => void;
}) {
  const participant = match.currentUserParticipant;
  const pending = participant?.status === 'pending';
  const rejected = participant?.status === 'rejected';
  const pendingRequestCount = match.visibleParticipants.filter(
    (row) => row.status === 'pending',
  ).length;
  const hostCanEditRoster = canHostEditRoster(match, scheduleNow);
  const hostCanCancel = canHostCancelMatch(match, scheduleNow);
  const playerCanWithdraw = canPlayerWithdraw(match, scheduleNow);

  if (match.status === 'cancelled') {
    return (
      <View style={styles.footerInner}>
        <View style={styles.pendingButton}>
          <Text style={styles.pendingText}>This match was cancelled</Text>
        </View>
      </View>
    );
  }

  if (match.status === 'finished') {
    if (needsRating) {
      return (
        <View style={styles.footerInner}>
          <Pressable onPress={onRatePlayers} style={styles.requestButton}>
            <Ionicons name="star-outline" size={18} color={C.mist} />
            <Text style={styles.requestText}>Rate players</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.footerInner}>
        <View style={styles.pendingButton}>
          <Text style={styles.pendingText}>
            {match.isHost || match.currentUserParticipant?.status === 'accepted'
              ? 'Ratings submitted'
              : 'This match has finished'}
          </Text>
        </View>
      </View>
    );
  }

  if (match.isHost) {
    return (
      <View style={styles.footerInner}>
        <View style={styles.confirmedRow}>
          <Ionicons name="checkmark" size={15} color={C.success} />
          <Text style={styles.confirmedText}>You're hosting this match</Text>
        </View>
        {hostCanEditRoster && pendingRequestCount > 0 ? (
          <Text style={styles.hostPendingHint}>
            {pendingRequestCount} request{pendingRequestCount === 1 ? '' : 's'} waiting below
          </Text>
        ) : null}
        {hostCanCancel ? (
          <Pressable onPress={onCancelMatch} style={styles.footerGhostButton}>
            <Text style={styles.footerGhostText}>Cancel match</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (participant?.status === 'accepted') {
    return (
      <View style={styles.footerInner}>
        <View style={styles.confirmedRow}>
          <Ionicons name="checkmark" size={15} color={C.success} />
          <Text style={styles.confirmedText}>You're in — roster confirmed</Text>
        </View>
        <Pressable onPress={onMessageHost} style={styles.whatsappButton}>
          <Ionicons name="chatbox-outline" size={19} color={C.background} />
          <Text style={styles.whatsappText}>Message host on WhatsApp</Text>
        </Pressable>
        {playerCanWithdraw ? (
          <Pressable onPress={onWithdraw} style={styles.footerGhostButton}>
            <Text style={styles.footerGhostText}>Withdraw from match</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (pending) {
    return (
      <View style={styles.footerInner}>
        <View style={styles.pendingButton}>
          <View style={styles.pendingDot} />
          <Text style={styles.pendingText}>Request sent · awaiting host</Text>
        </View>
        <Pressable onPress={onCancelRequest} style={styles.footerGhostButton}>
          <Text style={styles.footerGhostText}>Cancel request</Text>
        </Pressable>
      </View>
    );
  }

  if (rejected) {
    return (
      <View style={styles.footerInner}>
        <View style={styles.pendingButton}>
          <Text style={styles.pendingText}>Request rejected by host</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.footerInner}>
      <Pressable
        onPress={onRequest}
        disabled={isBusy || match.status !== 'open'}
        style={[styles.requestButton, (isBusy || match.status !== 'open') && styles.requestButtonDisabled]}
      >
        <Ionicons name="flash" size={18} color={C.mist} />
        <Text style={styles.requestText}>
          {isBusy
            ? 'Sending...'
            : match.status === 'open'
              ? 'Request to Join'
              : match.status === 'full'
                ? 'Match is full'
                : 'Match unavailable'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function MatchDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { coords: userCoords } = useDiscoverLocation();
  const params = useLocalSearchParams<{ id?: string }>();
  const matchId = typeof params.id === 'string' ? params.id : null;
  const { data: match, isPending, error, refetch } = useMatchDetail(matchId);
  useMatchRealtime(matchId);
  const scheduleNow = useMatchScheduleClock(
    matchId,
    match?.starts_at,
    match?.duration_minutes,
  );
  const [message] = useState('');
  const [rosterInfoOpen, setRosterInfoOpen] = useState(false);
  const requestToJoin = useRequestToJoin(matchId ?? '');
  const updateStatus = useUpdateParticipantStatus(matchId ?? '');
  const cancelPending = useCancelPendingRequest(matchId ?? '');
  const cancelMatch = useCancelMatch(matchId ?? '');

  const canLoadRatings =
    match !== undefined &&
    match.status === 'finished' &&
    (match.isHost || match.currentUserParticipant?.status === 'accepted');
  const { data: ratableMatch } = useRatableMatch(
    canLoadRatings && matchId !== null ? matchId : null,
  );
  const needsRating =
    ratableMatch?.ratingWindowOpen === true &&
    ratableMatch.allRated === false &&
    ratableMatch.members.length > 0;

  function openRateMatch() {
    if (matchId === null) return;
    router.push(buildRateMatchRoute(matchId));
  }

  const canViewContacts =
    match !== undefined &&
    match.status !== 'cancelled' &&
    match.status !== 'finished' &&
    ((match.isHost && match.appAcceptedCount > 0) ||
      (!match.isHost && match.currentUserParticipant?.status === 'accepted'));
  const contactsQuery = useMatchContacts(matchId, canViewContacts);
  const hostManagesRoster =
    match !== undefined && canHostManageRoster(match, scheduleNow);
  const hostEditsRoster =
    match !== undefined && canHostEditRoster(match, scheduleNow);

  async function resolveContactList(): Promise<ContactRow[] | undefined> {
    if (contactsQuery.data !== undefined && contactsQuery.data.length > 0) {
      return contactsQuery.data;
    }
    const result = await contactsQuery.refetch();
    return result.data;
  }

  const participantProfilesById = useMemo(() => {
    return new Map(
      (match?.participantProfiles ?? [])
        .filter((profile): profile is PublicProfile & { id: string } => profile.id !== null)
        .map((profile) => [profile.id, profile]),
    );
  }, [match?.participantProfiles]);

  async function handleRequest(): Promise<void> {
    if (matchId === null) return;
    const participant = match?.currentUserParticipant;
    const existingParticipantId =
      participant?.status === 'cancelled' ? participant.id : null;

    try {
      await requestToJoin.mutateAsync({ message, existingParticipantId });
      Alert.alert('Request sent', 'The host can now accept or reject your request.');
    } catch (requestError) {
      const text = requestError instanceof Error ? requestError.message : 'Could not send request.';
      Alert.alert('Request failed', text);
    }
  }

  async function handleParticipantStatus(
    participantId: string,
    status: 'accepted' | 'rejected' | 'withdrawn' | 'removed',
  ): Promise<void> {
    try {
      await updateStatus.mutateAsync({ participantId, status });
    } catch (statusError) {
      const text = statusError instanceof Error ? statusError.message : 'Could not update request.';
      Alert.alert('Update failed', text);
    }
  }

  async function handleCancelPending(participantId: string): Promise<void> {
    try {
      await cancelPending.mutateAsync(participantId);
    } catch (cancelError) {
      const text = cancelError instanceof Error ? cancelError.message : 'Could not cancel request.';
      Alert.alert('Cancel failed', text);
    }
  }

  function handleCancelMatch(): void {
    if (match === undefined || !canHostCancelMatch(match, scheduleNow)) {
      return;
    }

    Alert.alert(
      'Cancel match?',
      'Players will no longer be able to join. Accepted players will see that this match was cancelled.',
      [
        { text: 'Keep match', style: 'cancel' },
        {
          text: 'Cancel match',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await cancelMatch.mutateAsync();
              } catch (cancelError) {
                const text =
                  cancelError instanceof Error ? cancelError.message : 'Could not cancel match.';
                Alert.alert('Cancel failed', text);
              }
            })();
          },
        },
      ],
    );
  }

  async function openHostContact(): Promise<void> {
    if (match === undefined) return;
    const contactList = await resolveContactList();
    await openContactForProfile(contactList, match.host_id);
  }

  async function openPlayerContact(profileId: string): Promise<void> {
    const contactList = await resolveContactList();
    await openContactForProfile(contactList, profileId);
  }

  if (isPending) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={C.mist} />
      </View>
    );
  }

  if (error instanceof UnsupportedSportError) {
    return (
      <View style={[styles.errorRoot, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorTitle}>This match is not available.</Text>
        <Text style={styles.errorSubtitle}>Padelcito only supports padel matches.</Text>
        <Pressable onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (error !== null || match === undefined) {
    return (
      <View style={[styles.errorRoot, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorTitle}>Could not load this match.</Text>
        <Pressable onPress={() => void refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const courtConfigs = resolveMatchCourtConfigs(match.court_configs, match.court_count);
  const distanceM = resolveMatchDistanceM({
    matchId: match.id,
    matchLocation: match.location,
    userCoords,
    queryClient,
  });
  const hostNote = match.description?.trim() ?? '';
  const locationSubtitle = resolveMatchLocationSubtitle(match);
  const acceptedParticipants = match.visibleParticipants.filter(
    (participant) => participant.status === 'accepted',
  );
  const hostName = match.host?.display_name ?? 'Host';
  const isAcceptedPlayer =
    !match.isHost && match.currentUserParticipant?.status === 'accepted';
  const playerCanWithdraw = canPlayerWithdraw(match, scheduleNow);
  const pendingRequestCount = match.visibleParticipants.filter(
    (participant) => participant.status === 'pending',
  ).length;
  const scrollPaddingBottom = playerCanWithdraw
    ? 164
    : isAcceptedPlayer
      ? 120
      : match.isHost && match.status !== 'cancelled'
        ? pendingRequestCount > 0
          ? 130
          : 110
        : 100;
  const hostRatingLabel = formatProfileRating(
    match.host?.rating_avg ?? null,
    match.host?.rating_count ?? null,
  );
  const hostReliabilityLabel = formatPublicReliabilityScore(
    match.host?.reliability_score ?? null,
    match.host?.penalty_count ?? 0,
  );
  const withdrawalThreshold = formatWithdrawalThreshold(match.late_withdrawal_threshold);
  const headerTop = insets.top + 16;

  return (
    <View style={styles.root}>
      <FloatingHeaderButton
        icon="chevron-back"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={{ top: headerTop, left: SCREEN_PADDING }}
      />
      <FloatingHeaderButton
        icon="share-outline"
        onPress={() => undefined}
        accessibilityLabel="Share match"
        style={{ top: headerTop, right: SCREEN_PADDING }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerTop,
            paddingBottom: scrollPaddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/*
          Future club hero image (venue photo + court caption overlay).
          When Storage/club assets exist, restore a ~188px hero here with:
          - cover image from club or match metadata
          - formatHeroCaption(court_count, courtConfigs) as overlay label
          - absolute-positioned back/share over the image
        <View style={styles.hero}>
          ...
        </View>
        */}

        <View style={styles.headerMetaRow}>
          <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
            MATCH DETAILS
          </Text>
        </View>

        <View style={styles.titleRow}>
            <View style={styles.titleInlineGroup}>
              <Text style={styles.matchTitle} numberOfLines={2}>
                {match.venue_name ?? match.title}
              </Text>
              {distanceM !== null ? (
                <View style={styles.titleDistancePill}>
                  <Ionicons name="location-outline" size={12} color={C.blueHi} />
                  <Text style={styles.distanceText}>{formatDistanceKm(distanceM)}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {locationSubtitle !== null ? (
            <Text style={styles.matchSubtitle} numberOfLines={2}>
              {locationSubtitle}
            </Text>
          ) : null}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={15} color={C.dim} />
            <View style={styles.dateScheduleGroup}>
              <Text style={styles.dateText}>
                {formatMatchScheduleLabel(match.starts_at, match.duration_minutes)}
              </Text>
              <MatchStatusBadge status={match.status} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatBox label="Duration" value={String(match.duration_minutes)} sub="MIN" />
            <StatBox
              label="Category"
              value={formatCategoryCompact(match.category_max, match.category_min)}
            />
            <StatBox
              label={match.price_per_player !== null ? 'Per Player' : 'Difficulty'}
              value={
                match.price_per_player !== null
                  ? formatMatchPriceArs(match.price_per_player)
                  : formatDifficultyLabel(match.difficulty)
              }
            />
          </View>

          <MatchDetailChips match={match} courtConfigs={courtConfigs} />

          <SectionHeader
            title="Roster"
            right={`${match.totalFilled}/${match.capacity} players`}
            trailingAction={
              match.offlineConfirmedCount === 0 ? (
                <RosterInfoButton onPress={() => setRosterInfoOpen(true)} />
              ) : null
            }
          />
          <View style={styles.rosterCard}>
            <PlayerRow
              name={hostName}
              index={0}
              host
              ratingLabel={hostRatingLabel}
              reliabilityLabel={hostReliabilityLabel}
            />
            {match.offlineConfirmedCount > 0 ? (
              <>
                <View style={styles.rosterDivider} />
                <OfflineConfirmedSummary
                  count={match.offlineConfirmedCount}
                  onInfoPress={() => setRosterInfoOpen(true)}
                />
              </>
            ) : null}
            {acceptedParticipants.map((participant, index) => {
              const profile = participantProfilesById.get(participant.profile_id);
              const name = profile?.display_name ?? 'Player';
              const ratingLabel = formatProfileRating(
                profile?.rating_avg ?? null,
                profile?.rating_count ?? null,
              );
              const reliabilityLabel = formatPublicReliabilityScore(
                profile?.reliability_score ?? null,
                profile?.penalty_count ?? 0,
              );
              return (
                <View key={participant.id}>
                  <View style={styles.rosterDivider} />
                  <PlayerRow
                    name={name}
                    index={match.offlineConfirmedCount + index + 1}
                    you={participant.profile_id === match.currentUserId}
                    ratingLabel={ratingLabel}
                    reliabilityLabel={reliabilityLabel}
                    onRemove={
                      hostManagesRoster
                        ? () => void handleParticipantStatus(participant.id, 'removed')
                        : undefined
                    }
                    onWhatsApp={
                      match.isHost && canViewContacts
                        ? () => void openPlayerContact(participant.profile_id)
                        : undefined
                    }
                  />
                </View>
              );
            })}
            {match.joinSpotsRemaining > 0 && match.status !== 'cancelled' ? (
              <>
                <View style={styles.rosterDivider} />
                <OpenSpots count={match.joinSpotsRemaining} />
              </>
            ) : null}
          </View>

          {match.isHost && hostEditsRoster ? (
            <View style={styles.hostInboxCard}>
              <Text style={styles.noteLabel}>Pending Requests</Text>
              {match.visibleParticipants.filter((participant) => participant.status === 'pending').length === 0 ? (
                <Text style={styles.noteText}>No pending requests yet.</Text>
              ) : (
                <View style={styles.requestList}>
                  {match.visibleParticipants
                    .filter((participant) => participant.status === 'pending')
                    .map((participant) => {
                      const profile = participantProfilesById.get(participant.profile_id);
                      return (
                        <View key={participant.id} style={styles.requestRow}>
                          <View style={styles.requestCopy}>
                            <Text style={styles.requestName}>{profile?.display_name ?? 'Player'}</Text>
                            {participant.message !== null ? (
                              <Text style={styles.requestMessage}>{participant.message}</Text>
                            ) : null}
                          </View>
                          <View style={styles.requestActions}>
                            <Pressable
                              onPress={() => void handleParticipantStatus(participant.id, 'accepted')}
                              style={styles.acceptSmall}
                            >
                              <Text style={styles.acceptSmallText}>Accept</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => void handleParticipantStatus(participant.id, 'rejected')}
                              style={styles.rejectSmall}
                            >
                              <Text style={styles.rejectSmallText}>Reject</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}
            </View>
          ) : null}

          {hasHostNote(match.description) ? (
            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>Note From {hostName.split(' ')[0] ?? 'Host'}</Text>
              <Text style={styles.noteText}>{hostNote}</Text>
            </View>
          ) : null}

          {playerCanWithdraw ? (
            <View style={styles.penaltyCard}>
              <Ionicons name="notifications-outline" size={16} color={C.warning} style={styles.penaltyIcon} />
              <Text style={styles.penaltyText}>
                Cancelling within <Text style={styles.penaltyStrong}>{withdrawalThreshold}</Text> of start time affects your trust score and may incur a no-show penalty.
              </Text>
            </View>
          ) : null}
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={['transparent', C.background]}
        style={styles.footerFade}
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <FooterAction
          match={match}
          scheduleNow={scheduleNow}
          isBusy={requestToJoin.isPending}
          onRequest={() => void handleRequest()}
          onCancelRequest={() => {
            const participantId = match.currentUserParticipant?.id;
            if (participantId !== undefined) {
              void handleCancelPending(participantId);
            }
          }}
          onWithdraw={() => {
            const participantId = match.currentUserParticipant?.id;
            if (participantId !== undefined) {
              void handleParticipantStatus(participantId, 'withdrawn');
            }
          }}
          onMessageHost={() => void openHostContact()}
          onCancelMatch={handleCancelMatch}
          needsRating={needsRating}
          onRatePlayers={openRateMatch}
        />
      </View>

      <RosterInfoSheet
        visible={rosterInfoOpen}
        onClose={() => setRosterInfoOpen(false)}
        stats={{
          capacity: match.capacity,
          offlineConfirmedCount: match.offlineConfirmedCount,
          appAcceptedCount: match.appAcceptedCount,
          joinSpotsRemaining: match.joinSpotsRemaining,
          totalFilled: match.totalFilled,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRoot: {
    flex: 1,
    backgroundColor: C.background,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 18,
    color: C.warning,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
    color: C.dim,
    marginBottom: 16,
  },
  retryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.3,
    color: C.mist,
    textTransform: 'uppercase',
  },
  scrollContent: {
    backgroundColor: C.background,
    paddingHorizontal: SCREEN_PADDING,
  },
  headerButton: {
    position: 'absolute',
    zIndex: 10,
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
  },
  headerMetaRow: {
    height: HEADER_BUTTON_SIZE,
    justifyContent: 'center',
    paddingLeft: HEADER_TEXT_INSET,
    paddingRight: HEADER_TEXT_INSET,
    marginBottom: 4,
  },
  titleRow: {
    marginBottom: 4,
  },
  titleInlineGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 6,
    maxWidth: '100%',
  },
  metaChip: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipPrimary: {
    backgroundColor: 'rgba(68,88,166,0.18)',
    borderColor: C.blue,
  },
  metaChipSecondary: {
    backgroundColor: C.surface1,
    borderColor: 'rgba(94,112,184,0.45)',
  },
  metaChipDefault: {
    backgroundColor: C.surface1,
    borderColor: C.hair,
  },
  metaChipText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaChipTextPrimary: {
    color: '#C7CEE8',
  },
  metaChipTextSecondary: {
    color: C.mist,
  },
  metaChipTextDefault: {
    color: C.dim,
  },
  titleDistancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface3,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexShrink: 0,
  },
  distanceText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.mist,
  },
  matchTitle: {
    flexShrink: 1,
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 25,
    lineHeight: 30,
    color: C.mist,
    letterSpacing: -0.6,
  },
  matchSubtitle: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: C.dim,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  dateScheduleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  dateText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14.5,
    color: C.dim,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexShrink: 0,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.success,
  },
  statusBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  preferenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    minHeight: 78,
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 19,
    color: C.mist,
    letterSpacing: -0.3,
  },
  statSub: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    color: C.dim,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11.5,
    letterSpacing: 2,
    color: C.dim,
    textTransform: 'uppercase',
  },
  sectionRight: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: C.blueHi,
    textTransform: 'uppercase',
  },
  rosterCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 18,
  },
  playerRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  playerName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15.5,
    color: C.mist,
    flexShrink: 1,
  },
  hostPill: {
    borderWidth: 1,
    borderColor: C.blue,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hostPillText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9,
    letterSpacing: 1,
    color: C.blueHi,
    textTransform: 'uppercase',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    color: C.mist,
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rosterWhatsAppButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.surface3,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    borderRadius: 8,
    backgroundColor: 'rgba(224,177,91,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.30)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  removeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: C.warning,
    textTransform: 'uppercase',
  },
  rosterDivider: {
    height: 1,
    backgroundColor: C.hair2,
  },
  offlineSummaryRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  offlineDotStack: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 52,
  },
  offlineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.surface3,
    borderWidth: 1.5,
    borderColor: C.surface1,
  },
  offlineDotOverlap: {
    marginLeft: -8,
  },
  offlineDotOverflow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderColor: C.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineDotOverflowText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 8,
    color: C.dim,
  },
  offlineSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  offlineSummaryTitle: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 13.5,
    color: C.dim,
  },
  offlineSummaryHint: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 11.5,
    color: C.faint,
    marginTop: 1,
  },
  openSpotsRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  emptyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.ghost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openSpotsText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.dim,
  },
  hostInboxCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  requestList: {
    gap: 14,
  },
  requestRow: {
    gap: 12,
  },
  requestCopy: {
    gap: 4,
  },
  requestName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.mist,
  },
  requestMessage: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    color: C.dim,
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptSmall: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptSmallText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
    color: C.mist,
  },
  rejectSmall: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectSmallText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
    color: C.warning,
  },
  noteCard: {
    backgroundColor: 'rgba(94,112,184,0.12)',
    borderWidth: 1,
    borderColor: C.blue,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  noteLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.blueHi,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  noteText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14.5,
    lineHeight: 22,
    color: '#D4D8EA',
  },
  penaltyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(224,177,91,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.30)',
  },
  penaltyIcon: {
    marginTop: 1,
  },
  penaltyText: {
    flex: 1,
    fontFamily: 'Hanken Grotesk',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#E0CBA0',
  },
  penaltyStrong: {
    fontFamily: 'HankenGrotesk-Bold',
    color: C.warning,
  },
  footerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 116,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    backgroundColor: 'rgba(11,11,11,0.94)',
    borderTopWidth: 1,
    borderTopColor: C.hair2,
  },
  footerInner: {
    gap: 10,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  confirmedText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: C.success,
    textTransform: 'uppercase',
  },
  hostPendingHint: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 13,
    color: C.dim,
    textAlign: 'center',
  },
  whatsappButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.mist,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  whatsappText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16.5,
    color: C.background,
  },
  footerGhostButton: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  footerGhostText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: C.dim,
    textTransform: 'uppercase',
  },
  pendingButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pendingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.blueHi,
  },
  pendingText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16,
    color: C.dim,
  },
  requestButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  requestButtonDisabled: {
    backgroundColor: C.surface1,
  },
  requestText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16.5,
    color: C.mist,
  },
});
