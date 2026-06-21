import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, View, Text, Pressable } from '@/tw';
import { useDiscoverLocation } from '@/features/discover/use-discover-location';
import {
  useCancelPendingRequest,
  useMatchContacts,
  useMatchDetail,
  useRequestToJoin,
  useUpdateParticipantStatus,
  type MatchDetail,
} from '@/features/matches/use-matches';
import { useMatchRealtime } from '@/features/matches/use-match-realtime';
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
  type MatchMetaChipEmphasis,
} from '@/features/matches/match-display';
import type { CourtConfig } from '@/lib/padel-court';
import { formatMatchScheduleLabel } from '@/lib/match-time';
import { UnsupportedSportError } from '@/lib/padel-sport';
import type { Database } from '@/types/database';

type PublicProfile = Database['public']['Views']['public_profiles']['Row'];

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
  onRemove,
}: {
  name: string;
  index: number;
  host?: boolean;
  you?: boolean;
  ratingLabel: string | null;
  onRemove?: () => void;
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
        {ratingLabel !== null ? (
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.blueHi} />
            <Text style={styles.trustText}>{ratingLabel}</Text>
          </View>
        ) : null}
      </View>
      {onRemove !== undefined ? (
        <Pressable onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right !== undefined ? <Text style={styles.sectionRight}>{right}</Text> : null}
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
  isBusy,
  onRequest,
  onCancel,
  onWithdraw,
  onOpenContacts,
}: {
  match: MatchDetail;
  isBusy: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onWithdraw: () => void;
  onOpenContacts: () => void;
}) {
  const participant = match.currentUserParticipant;
  const accepted = match.isHost || participant?.status === 'accepted';
  const pending = participant?.status === 'pending';
  const rejected = participant?.status === 'rejected';

  if (accepted) {
    return (
      <View style={styles.footerInner}>
        <View style={styles.confirmedRow}>
          <Ionicons name="checkmark" size={15} color={C.success} />
          <Text style={styles.confirmedText}>You're in — roster confirmed</Text>
        </View>
        <Pressable onPress={onOpenContacts} style={styles.whatsappButton}>
          <Ionicons name="chatbox-outline" size={19} color={C.background} />
          <Text style={styles.whatsappText}>Message group on WhatsApp</Text>
        </Pressable>
        {!match.isHost ? (
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
        <Pressable onPress={onCancel} style={styles.footerGhostButton}>
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
          {isBusy ? 'Sending...' : match.status === 'open' ? 'Request to Join' : 'Match is full'}
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
  const [message] = useState('');
  const requestToJoin = useRequestToJoin(matchId ?? '');
  const updateStatus = useUpdateParticipantStatus(matchId ?? '');
  const cancelPending = useCancelPendingRequest(matchId ?? '');

  const canViewContacts =
    match !== undefined &&
    (match.isHost || match.currentUserParticipant?.status === 'accepted');
  const contacts = useMatchContacts(matchId, canViewContacts);

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

  async function openFirstContact(): Promise<void> {
    const firstLink = contacts.data?.find((contact) => contact.whatsapp_link !== null)?.whatsapp_link;
    if (firstLink === undefined || firstLink === null) {
      Alert.alert('No WhatsApp link', 'No contact has a WhatsApp link available yet.');
      return;
    }
    await Linking.openURL(firstLink);
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
  const showSubtitle =
    match.venue_name !== null &&
    match.venue_name.trim().length > 0 &&
    match.title.trim().length > 0 &&
    match.venue_name.trim() !== match.title.trim();
  const acceptedParticipants = match.visibleParticipants.filter(
    (participant) => participant.status === 'accepted',
  );
  const filled = Math.min(1 + acceptedParticipants.length, match.capacity);
  const spotsOpen = Math.max(match.capacity - filled, 0);
  const hostName = match.host?.display_name ?? 'Host';
  const isAccepted = match.isHost || match.currentUserParticipant?.status === 'accepted';
  const hostRatingLabel = formatProfileRating(
    match.host?.rating_avg ?? null,
    match.host?.rating_count ?? null,
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
            paddingBottom: isAccepted ? 164 : 100,
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
          {showSubtitle ? (
            <Text style={styles.matchSubtitle} numberOfLines={2}>
              {match.title}
            </Text>
          ) : null}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={15} color={C.dim} />
            <Text style={styles.dateText}>
              {formatMatchScheduleLabel(match.starts_at, match.duration_minutes)}
            </Text>
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

          <SectionHeader title="Roster" right={`${filled}/${match.capacity} Filled`} />
          <View style={styles.rosterCard}>
            <PlayerRow
              name={hostName}
              index={0}
              host
              ratingLabel={hostRatingLabel}
            />
            {acceptedParticipants.map((participant, index) => {
              const profile = participantProfilesById.get(participant.profile_id);
              const name = profile?.display_name ?? 'Player';
              const ratingLabel = formatProfileRating(
                profile?.rating_avg ?? null,
                profile?.rating_count ?? null,
              );
              return (
                <View key={participant.id}>
                  <View style={styles.rosterDivider} />
                  <PlayerRow
                    name={name}
                    index={index + 1}
                    you={participant.profile_id === match.currentUserId}
                    ratingLabel={ratingLabel}
                    onRemove={
                      match.isHost
                        ? () => void handleParticipantStatus(participant.id, 'removed')
                        : undefined
                    }
                  />
                </View>
              );
            })}
            {spotsOpen > 0 ? (
              <>
                <View style={styles.rosterDivider} />
                <OpenSpots count={spotsOpen} />
              </>
            ) : null}
          </View>

          {match.isHost ? (
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

          {isAccepted ? (
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
          isBusy={requestToJoin.isPending}
          onRequest={() => void handleRequest()}
          onCancel={() => {
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
          onOpenContacts={() => void openFirstContact()}
        />
      </View>
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
  dateText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14.5,
    color: C.dim,
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
    marginBottom: 6,
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
