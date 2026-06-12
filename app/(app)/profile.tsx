import { View, Text, ScrollView, Pressable } from '@/tw';
import { StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import {
  useProfile,
  useProfileSport,
  skillLevelToBadge,
  SKILL_LABEL,
} from '@/features/profile/use-profile';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface3: '#232429',
  primary: '#2B396D',
  primaryHi: '#5E70B8',
  neutral: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  ghost: 'rgba(228,228,228,0.20)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  warning: '#E0B15B',
  skill: {
    A: { bg: '#2B396D', fg: '#E4E4E4' },
    B: { bg: 'rgba(68,88,166,0.18)', fg: '#A9B6E6' },
    C: { bg: '#232429', fg: 'rgba(228,228,228,0.60)' },
    D: { bg: '#232429', fg: 'rgba(228,228,228,0.38)' },
  },
} as const;

const AV_TONES: [string, string][] = [
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#E4E4E4'],
  ['#202126', '#E4E4E4'],
  ['#4458A6', '#0B0B0B'],
  ['#2A2B30', '#E4E4E4'],
  ['#1C2649', '#E4E4E4'],
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, size = 64 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
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
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.avatarText, { color: fg, fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

function SkillBadge({ level }: { level: 'A' | 'B' | 'C' | 'D' }) {
  const s = C.skill[level];
  return (
    <View style={[styles.skillBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.skillBadgeText, { color: s.fg }]}>{SKILL_LABEL[level]}</Text>
    </View>
  );
}

// Trust ring uses react-native-svg — the only SVG component in this screen
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
          cx={cx} cy={cy} r={r}
          fill="none" stroke={C.primaryHi} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}>
        <View style={styles.ringCenter}>
          <Text style={styles.ringValue}>{value > 0 ? value.toFixed(1) : '—'}</Text>
          <Text style={styles.ringLabel}>TRUST</Text>
        </View>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <View className="px-5 pb-3">
      <Text style={styles.sectionLabel}>{children}</Text>
    </View>
  );
}

interface PreferenceRowProps {
  label: string;
  value?: string;
  isFirst?: boolean;
  onPress?: () => void;
  labelColor?: string;
}

function PreferenceRow({ label, value, isFirst = false, onPress, labelColor }: PreferenceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70"
      style={[styles.prefRow, !isFirst && styles.prefRowBorder]}
    >
      <Text style={[styles.prefLabel, labelColor ? { color: labelColor } : undefined]}>
        {label}
      </Text>
      <View style={styles.prefRight}>
        {value !== undefined && value.length > 0 && (
          <Text style={styles.prefValue}>{value}</Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={C.ghost} />
      </View>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  sub,
  showFlame = false,
}: {
  label: string;
  value: string;
  sub?: string;
  showFlame?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {sub !== undefined && <Text style={styles.statSub}>{sub}</Text>}
        {showFlame && (
          <Ionicons name="flame" size={17} color={C.primaryHi} style={{ marginLeft: 1 }} />
        )}
      </View>
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <View className="gap-4 px-5 pt-4">
      <View style={styles.identityCard}>
        <View style={[styles.skeletonPill, { width: 64, height: 64, borderRadius: 32 }]} />
        <View className="flex-1 gap-2">
          <View style={[styles.skeletonPill, { width: 140, height: 14 }]} />
          <View style={[styles.skeletonPill, { width: 100, height: 11 }]} />
        </View>
        <View style={[styles.skeletonPill, { width: 92, height: 92, borderRadius: 46 }]} />
      </View>
      <View className="flex-row gap-2.5">
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.statCard, { flex: 1 }]}>
            <View style={[styles.skeletonPill, { width: 40, height: 10, marginBottom: 8 }]} />
            <View style={[styles.skeletonPill, { width: 30, height: 20 }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Sign-out ──────────────────────────────────────────────────────────────────

function useSignOut() {
  return function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          // Root layout's onAuthStateChange fires → session = null → redirect to login.
        },
      },
    ]);
  };
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: profile, isPending: profilePending } = useProfile();
  const { data: sport } = useProfileSport();
  const signOut = useSignOut();

  const badge = sport ? skillLevelToBadge(sport.skill_level) : ('C' as const);
  const rating = profile?.rating_avg ?? 0;
  const ratingCount = profile?.rating_count ?? 0;
  const displayName = profile?.display_name ?? 'Player';
  const username = profile?.username ?? '';
  const bio = profile?.bio;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-8">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="px-5 pb-4 flex-row justify-between items-start"
      >
        <View>
          <Text style={styles.screenLabel}>PROFILE</Text>
          <Text style={styles.screenTitle}>You</Text>
        </View>
        <Pressable
          className="active:opacity-70"
          style={styles.settingsBtn}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={19} color={C.neutral} />
        </Pressable>
      </View>

      {profilePending ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Identity card */}
          <View style={[styles.identityCard, { marginHorizontal: 20, marginBottom: 16 }]}>
            <Avatar name={displayName} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.identityName}>{displayName}</Text>
              <View style={styles.identityBadgeRow}>
                <SkillBadge level={badge} />
                {username.length > 0 && (
                  <Text style={styles.username}>@{username}</Text>
                )}
              </View>
            </View>
            <TrustRing value={rating} size={92} />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard label="PLAYED" value={String(ratingCount)} />
            <StatCard label="RATING" value={rating > 0 ? rating.toFixed(1) : '—'} />
            <StatCard label="STREAK" value="—" showFlame />
          </View>

          {/* Preferences */}
          <SectionLabel>PREFERENCES</SectionLabel>
          <View style={[styles.prefCard, { marginHorizontal: 20, marginBottom: 16 }]}>
            <PreferenceRow label="Bio" value={bio ?? undefined} isFirst />
            <PreferenceRow label="Skill Level" value={SKILL_LABEL[badge]} />
            <PreferenceRow label="Location" value="Set location" />
          </View>

          {/* Account */}
          <SectionLabel>ACCOUNT</SectionLabel>
          <View style={[styles.prefCard, { marginHorizontal: 20 }]}>
            <PreferenceRow
              label="Sign Out"
              isFirst
              onPress={signOut}
              labelColor={C.warning}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.faint,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 30,
    color: C.neutral,
    letterSpacing: -0.8,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
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
  skillBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  skillBadgeText: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  identityName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 19,
    color: C.neutral,
    marginBottom: 6,
  },
  identityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    color: C.faint,
    letterSpacing: 0.5,
  },
  ringCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontFamily: 'Space Mono',
    fontSize: 22,
    fontWeight: '700',
    color: C.neutral,
    lineHeight: 26,
  },
  ringLabel: {
    fontFamily: 'Space Mono',
    fontSize: 8.5,
    color: C.faint,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    padding: 14,
    paddingTop: 15,
  },
  statLabel: {
    fontFamily: 'Space Mono',
    fontSize: 9.5,
    color: C.faint,
    letterSpacing: 1.5,
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
    fontSize: 22,
    color: C.neutral,
    letterSpacing: -0.5,
  },
  statSub: {
    fontFamily: 'Space Mono',
    fontSize: 12,
    color: C.dim,
  },
  sectionLabel: {
    fontFamily: 'Space Mono',
    fontSize: 11.5,
    color: C.faint,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  prefCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  prefRowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.hair2,
  },
  prefLabel: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: C.neutral,
  },
  prefRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  prefValue: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
    color: C.dim,
  },
  skeletonPill: {
    backgroundColor: C.surface3,
    borderRadius: 4,
  },
});
