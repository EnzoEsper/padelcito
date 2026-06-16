import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View, Text, Pressable } from '@/tw';
import {
  useCancelPendingRequest,
  useMatchContacts,
  useMatchDetail,
  useRequestToJoin,
  useUpdateParticipantStatus,
  type MatchDetail,
} from '@/features/matches/use-matches';
import { useMatchRealtime } from '@/features/matches/use-match-realtime';
import { UnsupportedSportError } from '@/lib/padel-sport';
import type { Database } from '@/types/database';

type SkillBadgeLevel = 'A' | 'B' | 'C' | 'D';
type PublicProfile = Database['public']['Views']['public_profiles']['Row'];

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface2: '#1B1C21',
  surface3: '#232429',
  blue: '#2B396D',
  blueDeep: '#1C2649',
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

const SKILL_LABEL: Record<SkillBadgeLevel, string> = {
  A: 'A · Pro',
  B: 'B · Adv',
  C: 'C · Int',
  D: 'D · Beg',
};

const AVATAR_TONES: [string, string][] = [
  ['#4458A6', '#E4E4E4'],
  ['#263665', '#E4E4E4'],
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#0B0B0B'],
];

function formatWhen(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const sameDate = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const day = sameDate(date, now)
    ? 'Today'
    : sameDate(date, tomorrow)
      ? 'Tomorrow'
      : new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return `${day}, ${time}`;
}

function skillBadge(match: MatchDetail): SkillBadgeLevel {
  const level = match.skill_max ?? match.skill_min;
  switch (level) {
    case 'pro':
    case 'expert':
      return 'A';
    case 'advanced':
      return 'B';
    case 'intermediate':
      return 'C';
    case 'beginner':
      return 'D';
    default:
      return 'B';
  }
}

function derivedDistance(matchId: string): number {
  const seed = Number.parseInt(matchId.slice(0, 2), 16);
  const normalized = Number.isNaN(seed) ? 0.35 : seed / 255;
  return Math.round((0.6 + normalized * 3.2) * 10) / 10;
}

function derivedPrice(matchId: string): number {
  const seed = Number.parseInt(matchId.slice(-2), 16);
  const normalized = Number.isNaN(seed) ? 0.5 : seed / 255;
  return Math.round(8 + normalized * 8);
}

function derivedRating(profileId: string): string {
  const seed = Number.parseInt(profileId.slice(0, 2), 16);
  const normalized = Number.isNaN(seed) ? 0.6 : seed / 255;
  return (4.1 + normalized * 0.8).toFixed(1);
}

function surfaceLabel(match: MatchDetail): string {
  const source = `${match.title} ${match.venue_name ?? ''}`.toLowerCase();
  if (source.includes('panoramic')) return 'Panoramic';
  if (source.includes('clay')) return 'Clay';
  return 'Glass';
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function SkillBadge({ level, small = false }: { level: SkillBadgeLevel; small?: boolean }) {
  const primary = level === 'A' || level === 'B';
  return (
    <View style={[styles.skillBadge, small && styles.skillBadgeSmall, primary ? styles.skillPrimary : styles.skillMuted]}>
      <Text style={[styles.skillText, small && styles.skillTextSmall, primary ? styles.skillTextPrimary : styles.skillTextMuted]}>
        {SKILL_LABEL[level]}
      </Text>
    </View>
  );
}

function HeaderButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.heroButton}>
      <Ionicons name={icon} size={21} color={C.mist} />
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
  profileId,
  index,
  host = false,
  you = false,
  level,
  onRemove,
}: {
  name: string;
  profileId: string;
  index: number;
  host?: boolean;
  you?: boolean;
  level: SkillBadgeLevel;
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
        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color={C.blueHi} />
          <Text style={styles.trustText}>{derivedRating(profileId)}</Text>
        </View>
      </View>
      {onRemove !== undefined ? (
        <Pressable onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      ) : (
        <SkillBadge level={level} small />
      )}
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

  const level = skillBadge(match);
  const acceptedParticipants = match.visibleParticipants.filter(
    (participant) => participant.status === 'accepted',
  );
  const filled = Math.min(1 + acceptedParticipants.length, match.capacity);
  const spotsOpen = Math.max(match.capacity - filled, 0);
  const hostName = match.host?.display_name ?? 'Host';
  const hostProfileId = match.host_id;
  const isAccepted = match.isHost || match.currentUserParticipant?.status === 'accepted';
  const note = match.description ?? 'Competitive doubles, looking for one solid player to close the match.';

  return (
    <View style={styles.root}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isAccepted ? 164 : 100 }]}
      >
        <View style={styles.hero}>
          <LinearGradient
            colors={[C.blueDeep, C.surface2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {Array.from({ length: 18 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.heroStripe,
                { left: index * 24 - 120 },
              ]}
            />
          ))}
          <LinearGradient
            colors={['rgba(11,11,11,0.05)', C.background]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroControls, { top: insets.top + 14 }]}>
            <HeaderButton icon="chevron-back" onPress={() => router.back()} />
            <HeaderButton icon="share-outline" onPress={() => undefined} />
          </View>
          <Text style={styles.heroCaption}>
            Court Photo · {surfaceLabel(match)} Court
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <SkillBadge level={level} small />
            <View style={styles.distancePill}>
              <Ionicons name="location-outline" size={12} color={C.blueHi} />
              <Text style={styles.distanceText}>{derivedDistance(match.id).toFixed(1)}KM</Text>
            </View>
          </View>

          <Text style={styles.matchTitle}>{match.venue_name ?? match.title}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={15} color={C.dim} />
            <Text style={styles.dateText}>{formatWhen(match.starts_at)}</Text>
          </View>

          <View style={styles.statsRow}>
            <StatBox label="Duration" value={String(match.duration_minutes)} sub="MIN" />
            <StatBox label="Surface" value={surfaceLabel(match)} />
            <StatBox label="Per Player" value={`$${derivedPrice(match.id)}`} />
          </View>

          <SectionHeader title="Roster" right={`${filled}/${match.capacity} Filled`} />
          <View style={styles.rosterCard}>
            <PlayerRow
              name={hostName}
              profileId={hostProfileId}
              index={0}
              host
              level={level}
            />
            {acceptedParticipants.map((participant, index) => {
              const profile = participantProfilesById.get(participant.profile_id);
              const name = profile?.display_name ?? 'Player';
              return (
                <View key={participant.id}>
                  <View style={styles.rosterDivider} />
                  <PlayerRow
                    name={name}
                    profileId={participant.profile_id}
                    index={index + 1}
                    you={participant.profile_id === match.currentUserId}
                    level={level}
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

          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Note From {hostName.split(' ')[0] ?? 'Host'}</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>

          {isAccepted ? (
            <View style={styles.penaltyCard}>
              <Ionicons name="notifications-outline" size={16} color={C.warning} style={styles.penaltyIcon} />
              <Text style={styles.penaltyText}>
                Cancelling within <Text style={styles.penaltyStrong}>12h</Text> of start time affects your trust score and may incur a no-show penalty.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={['transparent', C.background]}
        style={styles.footerFade}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
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
  },
  hero: {
    height: 188,
    overflow: 'hidden',
    position: 'relative',
  },
  heroStripe: {
    position: 'absolute',
    top: -80,
    width: 1,
    height: 360,
    backgroundColor: 'rgba(94,112,184,0.24)',
    transform: [{ rotate: '43deg' }],
  },
  heroControls: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(11,11,11,0.55)',
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCaption: {
    position: 'absolute',
    alignSelf: 'center',
    top: 56,
    maxWidth: 190,
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    lineHeight: 21,
    letterSpacing: 2,
    color: C.dim,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  body: {
    paddingHorizontal: 8,
    marginTop: -34,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  skillBadge: {
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skillBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  skillPrimary: {
    backgroundColor: 'rgba(68,88,166,0.18)',
  },
  skillMuted: {
    backgroundColor: C.surface3,
  },
  skillText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  skillTextSmall: {
    fontSize: 10,
  },
  skillTextPrimary: {
    color: '#C7CEE8',
  },
  skillTextMuted: {
    color: C.dim,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface3,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  distanceText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.mist,
  },
  matchTitle: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 25,
    lineHeight: 30,
    color: C.mist,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dateText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14.5,
    color: C.dim,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
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
    paddingHorizontal: 8,
    paddingTop: 14,
    backgroundColor: 'rgba(11,11,11,0.92)',
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
