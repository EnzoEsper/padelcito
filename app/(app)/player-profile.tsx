import { useCallback } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View as RNView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Pressable, ScrollView, Text, View } from '@/tw';
import {
  useProfile,
  SKILL_LEVEL_COLORS,
  SKILL_LEVEL_LABEL,
  type SkillLevel,
} from '@/features/profile/use-profile';
import { usePublicProfile } from '@/features/profile/use-public-profile';
import {
  resolvePlayerProfileReturnRoute,
} from '@/features/safety/safety-display';
import { useUserActionsSheet } from '@/features/safety/user-actions-sheet';
import { SCREEN_PADDING } from '@/components/stack-screen-layout';

const BACK_BUTTON_SIZE = 44;

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface3: '#232429',
  primaryHi: '#5E70B8',
  neutral: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
} as const;

const AV_TONES: [string, string][] = [
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#E4E4E4'],
  ['#202126', '#E4E4E4'],
  ['#4458A6', '#0B0B0B'],
  ['#2A2B30', '#E4E4E4'],
  ['#1C2649', '#E4E4E4'],
];

function parseRouteParam(value: string | string[] | undefined): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value.length > 0 ? value : null;
}

function Avatar({ name, size = 64 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const toneIdx =
    ((name.charCodeAt(0) ?? 0) + (name.charCodeAt(1) ?? 0)) % AV_TONES.length;
  const [bg, fg] = AV_TONES[toneIdx] ?? AV_TONES[0];

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: fg, fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

function SkillBadge({ skillLevel }: { skillLevel: SkillLevel }) {
  const colors = SKILL_LEVEL_COLORS[skillLevel];
  return (
    <View style={[styles.skillBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.skillBadgeText, { color: colors.fg }]}>
        {SKILL_LEVEL_LABEL[skillLevel]}
      </Text>
    </View>
  );
}

function TrustRing({ value, max = 5, size = 92 }: { value: number; max?: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={C.surface3} strokeWidth={6} />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={C.primaryHi}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </Svg>
      <RNView style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        <View style={styles.ringCenter}>
          <Text style={styles.ringValue}>{value > 0 ? value.toFixed(1) : '—'}</Text>
          <Text style={styles.ringLabel}>TRUST</Text>
        </View>
      </RNView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatMemberSince(isoDate: string | null): string | null {
  if (isoDate === null) return null;
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return null;
  const date = new Date(timestamp);
  const month = date.toLocaleString('en', { month: 'short' });
  const year = date.getFullYear();
  return `Member since ${month} ${year}`;
}

function formatReliabilityLabel(score: number | null): string {
  if (score === null) {
    return 'New';
  }
  return `${Math.round(score)}%`;
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string | string[];
    matchId?: string | string[];
    postId?: string | string[];
  }>();

  const userId = parseRouteParam(params.id);
  const matchId = parseRouteParam(params.matchId);
  const postId = parseRouteParam(params.postId);

  const ownProfileQuery = useProfile();
  const publicProfileQuery = usePublicProfile(userId);
  const { open: openUserActions, sheet: userActionsSheet } = useUserActionsSheet();

  const headerTop = insets.top + 16;
  const isSelf = ownProfileQuery.data?.id === userId;
  const profile = publicProfileQuery.data;
  const displayName = profile?.display_name ?? 'Player';

  const exitProfile = useCallback((): void => {
    const returnRoute = resolvePlayerProfileReturnRoute({ matchId, postId });
    if (returnRoute !== '/(app)/discover' || !router.canGoBack()) {
      router.replace(returnRoute as never);
      return;
    }
    router.back();
  }, [matchId, postId, router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        exitProfile();
        return true;
      });
      return () => subscription.remove();
    }, [exitProfile]),
  );

  const openSafetyMenu = () => {
    if (userId === null || isSelf) {
      return;
    }
    openUserActions({
      userId,
      displayName,
      context: {
        matchId: matchId ?? undefined,
        postId: postId ?? undefined,
        onBlocked: exitProfile,
      },
    });
  };

  return (
    <View style={styles.root}>
      <Pressable
        onPress={exitProfile}
        style={[styles.headerButton, { top: headerTop, left: SCREEN_PADDING }]}
        className="active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color={C.neutral} />
      </Pressable>

      {!isSelf && userId !== null ? (
        <Pressable
          onPress={openSafetyMenu}
          style={[styles.headerButton, { top: headerTop, right: SCREEN_PADDING }]}
          className="active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Player actions"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={C.neutral} />
        </Pressable>
      ) : null}

      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingTop: headerTop,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: SCREEN_PADDING,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerMetaRow}>
          <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
            PLAYER PROFILE
          </Text>
        </View>

        <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={styles.title}>
          {displayName}
        </Text>

        {matchId !== null ? (
          <View style={styles.contextChip}>
            <Ionicons name="tennisball-outline" size={14} color={C.primaryHi} />
            <Text style={styles.contextChipText}>In this match</Text>
          </View>
        ) : null}

        {postId !== null && matchId === null ? (
          <View style={styles.contextChip}>
            <Ionicons name="megaphone-outline" size={14} color={C.primaryHi} />
            <Text style={styles.contextChipText}>Post organizer</Text>
          </View>
        ) : null}

        {publicProfileQuery.isPending ? (
          <ActivityIndicator color={C.neutral} style={styles.loader} />
        ) : profile === undefined || profile === null ? (
          <Text style={styles.emptyText}>This player profile is not available.</Text>
        ) : (
          <>
            <View style={styles.identityCard}>
              <Avatar name={profile.display_name} size={64} />
              <View style={styles.identityMeta}>
                <Text style={styles.identityName} numberOfLines={1}>
                  {profile.display_name}
                </Text>
                {profile.username !== null && profile.username.length > 0 ? (
                  <Text style={styles.username} numberOfLines={1}>
                    @{profile.username}
                  </Text>
                ) : null}
                {profile.skill_level !== null ? (
                  <SkillBadge skillLevel={profile.skill_level} />
                ) : null}
              </View>
              <View style={styles.trustRing}>
                <TrustRing value={profile.rating_avg ?? 0} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard label="REVIEWS" value={String(profile.rating_count)} />
              <StatCard
                label="RATING"
                value={(profile.rating_avg ?? 0) > 0 ? (profile.rating_avg ?? 0).toFixed(1) : '—'}
              />
              <StatCard
                label="RELIABILITY"
                value={formatReliabilityLabel(profile.reliability_score)}
              />
            </View>

            <Text style={styles.sectionLabel}>ABOUT</Text>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>
                {profile.bio !== null && profile.bio.trim().length > 0
                  ? profile.bio
                  : 'No bio yet.'}
              </Text>
            </View>

            {formatMemberSince(profile.created_at) !== null ? (
              <Text style={styles.memberSince}>{formatMemberSince(profile.created_at)}</Text>
            ) : null}
          </>
        )}
      </ScrollView>

      {userActionsSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  headerButton: {
    position: 'absolute',
    zIndex: 10,
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMetaRow: {
    height: BACK_BUTTON_SIZE,
    justifyContent: 'center',
    paddingLeft: BACK_BUTTON_SIZE + 12,
    marginBottom: 4,
  },
  title: {
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  contextChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(94,112,184,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(94,112,184,0.25)',
  },
  contextChipText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    fontWeight: '600',
    color: C.primaryHi,
  },
  loader: {
    marginTop: 32,
  },
  emptyText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    color: C.dim,
    marginTop: 24,
  },
  identityCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 16,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: 'HankenGrotesk-Bold',
    letterSpacing: 0.3,
  },
  identityMeta: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 5,
  },
  identityName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 19,
    color: C.neutral,
  },
  username: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    color: C.dim,
    letterSpacing: 0.5,
  },
  skillBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skillBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trustRing: {
    flexShrink: 0,
  },
  ringCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 22,
    color: C.neutral,
    lineHeight: 26,
  },
  ringLabel: {
    fontFamily: 'Space Mono',
    fontSize: 8.5,
    color: C.dim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontFamily: 'Space Mono',
    fontSize: 9,
    letterSpacing: 1,
    color: C.faint,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 18,
    color: C.neutral,
  },
  sectionLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.faint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  aboutCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  aboutText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 21,
    color: C.dim,
  },
  memberSince: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    color: C.faint,
    textAlign: 'center',
  },
});
