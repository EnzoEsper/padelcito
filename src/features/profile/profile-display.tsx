import { StyleSheet, View as RNView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { View, Text } from '@/tw';
import { CachedRemoteImage } from '@/components/cached-remote-image';
import { ReliabilityBadge } from '@/components/reliability-badge';
import {
  formatReliabilityScore,
  hasPublicReliabilitySample,
  MIN_RELIABILITY_COMMITMENTS,
} from '@/features/ratings/penalty-report';
import {
  SKILL_LEVEL_COLORS,
  SKILL_LEVEL_LABEL,
  type SkillLevel,
} from '@/features/profile/use-profile';
import { formatPlayingProfileSummary, type PlayingProfileParts } from '@/lib/padel-position';
import {
  formatDemographicsSummary,
  type ProfileGender,
} from '@/lib/profile-demographics';

export const PROFILE_COLORS = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface3: '#232429',
  primaryHi: '#5E70B8',
  neutral: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  success: '#7BC89E',
} as const;

const AV_TONES: [string, string][] = [
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#E4E4E4'],
  ['#202126', '#E4E4E4'],
  ['#4458A6', '#0B0B0B'],
  ['#2A2B30', '#E4E4E4'],
  ['#1C2649', '#E4E4E4'],
];

type ProfileAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
};

export function ProfileAvatar({ name, avatarUrl, size = 64 }: ProfileAvatarProps) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const toneIdx =
    ((name.charCodeAt(0) ?? 0) + (name.charCodeAt(1) ?? 0)) % AV_TONES.length;
  const [bg, fg] = AV_TONES[toneIdx] ?? AV_TONES[0];

  if (avatarUrl !== null && avatarUrl !== undefined && avatarUrl.length > 0) {
    return (
      <CachedRemoteImage
        uri={avatarUrl}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        contentFit="cover"
        accessibilityLabel={`${name} avatar`}
      />
    );
  }

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

type SkillBadgeProps = {
  skillLevel: SkillLevel;
};

export function SkillBadge({ skillLevel }: SkillBadgeProps) {
  const colors = SKILL_LEVEL_COLORS[skillLevel];
  return (
    <View style={[styles.skillBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.skillBadgeText, { color: colors.fg }]}>
        {SKILL_LEVEL_LABEL[skillLevel]}
      </Text>
    </View>
  );
}

type RatingRingProps = {
  value: number;
  max?: number;
  size?: number;
};

export function RatingRing({ value, max = 5, size = 92 }: RatingRingProps) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={PROFILE_COLORS.surface3} strokeWidth={6} />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={PROFILE_COLORS.primaryHi}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </Svg>
      <RNView style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        <View style={styles.ringCenter}>
          <Text style={styles.ringValue}>{value > 0 ? value.toFixed(1) : '—'}</Text>
          <Text style={styles.ringLabel}>RATING</Text>
        </View>
      </RNView>
    </View>
  );
}

type ProfileStatCardProps = {
  label: string;
  value: string;
};

export function ProfileStatCard({ label, value }: ProfileStatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

type ReliabilityStatBlockProps = {
  reliabilityScore: number | null;
  penaltyCount: number;
  commitmentCount: number;
};

export function ReliabilityStatBlock({
  reliabilityScore,
  penaltyCount,
  commitmentCount,
}: ReliabilityStatBlockProps) {
  const label = formatReliabilityScore(reliabilityScore, commitmentCount);
  const subtitle = hasPublicReliabilitySample(commitmentCount)
    ? 'Established player'
    : `Building reliability (${commitmentCount}/${MIN_RELIABILITY_COMMITMENTS})`;

  return (
    <View style={styles.reliabilityCard}>
      <ReliabilityBadge
        reliabilityScore={reliabilityScore}
        penaltyCount={penaltyCount}
        compact={false}
      />
      <Text style={styles.reliabilityValue}>{label}</Text>
      <Text style={styles.reliabilitySubtitle}>{subtitle}</Text>
    </View>
  );
}

type ProfileDemographicsLineProps = {
  gender: ProfileGender | null;
  ageYears: number | null;
};

export function ProfileDemographicsLine({ gender, ageYears }: ProfileDemographicsLineProps) {
  const summary = formatDemographicsSummary({ gender, ageYears });
  if (summary === null) {
    return null;
  }

  return <Text style={styles.demographicsLine}>{summary}</Text>;
}

type PlayingProfileSectionProps = {
  parts: PlayingProfileParts;
};

export function PlayingProfileSection({ parts }: PlayingProfileSectionProps) {
  const summary = formatPlayingProfileSummary(parts);

  return (
    <View style={styles.playingSection}>
      <Text style={styles.sectionLabel}>PLAYING PROFILE</Text>
      <View style={styles.playingCard}>
        <Text style={styles.playingText}>
          {summary ?? 'Playing profile not set yet.'}
        </Text>
      </View>
    </View>
  );
}

type QualityHighlightChipProps = {
  label: string;
};

export function QualityHighlightChip({ label }: QualityHighlightChipProps) {
  return (
    <View style={styles.highlightChip}>
      <Text style={styles.highlightChipText}>{label}</Text>
    </View>
  );
}

export function formatMemberSince(isoDate: string | null): string | null {
  if (isoDate === null) return null;
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return null;
  const date = new Date(timestamp);
  const month = date.toLocaleString('en', { month: 'short' });
  const year = date.getFullYear();
  return `Member since ${month} ${year}`;
}

const styles = StyleSheet.create({
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
  ringCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 22,
    color: PROFILE_COLORS.neutral,
    lineHeight: 26,
  },
  ringLabel: {
    fontFamily: 'Space Mono',
    fontSize: 8.5,
    color: PROFILE_COLORS.dim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  statCard: {
    flex: 1,
    backgroundColor: PROFILE_COLORS.surface1,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.hair,
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
    color: PROFILE_COLORS.faint,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 18,
    color: PROFILE_COLORS.neutral,
  },
  reliabilityCard: {
    flex: 1,
    backgroundColor: PROFILE_COLORS.surface1,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.hair,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    gap: 6,
  },
  reliabilityValue: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 18,
    color: PROFILE_COLORS.neutral,
  },
  reliabilitySubtitle: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    lineHeight: 16,
    color: PROFILE_COLORS.faint,
  },
  playingSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.5,
    color: PROFILE_COLORS.faint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  playingCard: {
    backgroundColor: PROFILE_COLORS.surface1,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.hair,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  playingText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 21,
    color: PROFILE_COLORS.dim,
  },
  demographicsLine: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    color: PROFILE_COLORS.dim,
    marginTop: 2,
  },
  highlightChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: PROFILE_COLORS.surface3,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.hair,
  },
  highlightChipText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    fontWeight: '600',
    color: PROFILE_COLORS.dim,
  },
});
