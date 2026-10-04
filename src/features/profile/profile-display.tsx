import { type ReactNode } from 'react';
import {
  StyleSheet,
  Pressable,
  View as RNView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from '@/tw';
import { CachedRemoteImage } from '@/components/cached-remote-image';
import {
  hasPublicReliabilitySample,
  MIN_RELIABILITY_COMMITMENTS,
} from '@/features/ratings/penalty-report';
import {
  SKILL_LEVEL_COLORS,
  SKILL_LEVEL_LABEL,
  type SkillLevel,
} from '@/features/profile/use-profile';
import {
  categoryToTier,
  formatCategoryLabel,
  type PadelCategoryNumber,
  type PadelCategoryTier,
} from '@/lib/padel-category';
import {
  formatDominantHandLabel,
  formatPositionLabel,
  type PlayingProfileParts,
} from '@/lib/padel-position';

export const PROFILE_COLORS = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface3: '#232429',
  primaryHi: '#5E70B8',
  neutral: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  success: '#7BC89E',
  warning: '#E0B15B',
} as const;

export const PROFILE_LAYOUT = {
  horizontalPadding: 20,
  identityCardRadius: 22,
  groupRadius: 12,
  gap: 10,
  sectionGap: 24,
  labelGap: 6,
  rowHeight: 44,
  cardToStripGap: 12,
} as const;

const AV_TONES: [string, string][] = [
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#E4E4E4'],
  ['#202126', '#E4E4E4'],
  ['#4458A6', '#0B0B0B'],
  ['#2A2B30', '#E4E4E4'],
  ['#1C2649', '#E4E4E4'],
];

const TIER_STRIP_CAPTION: Record<PadelCategoryTier, string> = {
  beginner: 'Beginner',
  intermediate: 'Interm.',
  expert: 'Expert',
};

// ── Avatar & badges ───────────────────────────────────────────────────────────

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

const CATEGORY_TIER_BADGE_COLORS: Record<
  ReturnType<typeof categoryToTier>,
  { bg: string; fg: string }
> = {
  expert: SKILL_LEVEL_COLORS.pro,
  intermediate: SKILL_LEVEL_COLORS.intermediate,
  beginner: SKILL_LEVEL_COLORS.beginner,
};

type PadelCategoryBadgeProps = {
  category: PadelCategoryNumber;
};

export function PadelCategoryBadge({ category }: PadelCategoryBadgeProps) {
  const colors = CATEGORY_TIER_BADGE_COLORS[categoryToTier(category)];
  return (
    <View style={[styles.skillBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.skillBadgeText, { color: colors.fg }]}>
        {formatCategoryLabel(category)}
      </Text>
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

type ProfileHeroProps = {
  name: string;
  username: string | null;
  avatarUrl?: string | null;
  badge?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ProfileHero({
  name,
  username,
  avatarUrl,
  badge,
  containerStyle,
}: ProfileHeroProps) {
  const handle =
    username !== null && username.length > 0 ? `@${username}` : null;

  return (
    <View style={[styles.hero, containerStyle]}>
      <ProfileAvatar name={name} avatarUrl={avatarUrl} size={60} />
      <View style={styles.heroMeta}>
        <Text style={styles.heroName} numberOfLines={1}>
          {name}
        </Text>
        {handle !== null ? (
          <Text style={styles.heroHandle} numberOfLines={1}>
            {handle}
          </Text>
        ) : null}
        {badge ?? null}
      </View>
    </View>
  );
}

// ── Identity card (hero + rating ring) ────────────────────────────────────────

type RatingRingProps = {
  value: number;
  max?: number;
  size?: number;
  reviewCount?: number;
};

function formatReviewCaption(count: number): string {
  if (count <= 0) {
    return 'No reviews yet';
  }
  return count === 1 ? '1 review' : `${count} reviews`;
}

export function RatingRing({ value, max = 5, size = 80, reviewCount }: RatingRingProps) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const cx = size / 2;
  const cy = size / 2;
  const showReviews = reviewCount !== undefined;

  return (
    <View style={styles.ratingRingWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={PROFILE_COLORS.surface3}
            strokeWidth={6}
          />
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
      {showReviews ? (
        <Text style={styles.ringReviewCaption} numberOfLines={1}>
          {formatReviewCaption(reviewCount)}
        </Text>
      ) : null}
    </View>
  );
}

type ProfileIdentityCardProps = {
  name: string;
  username: string | null;
  avatarUrl?: string | null;
  badge?: ReactNode;
  rating: number;
  reviewCount: number;
  avatarSize?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ProfileIdentityCard({
  name,
  username,
  avatarUrl,
  badge,
  rating,
  reviewCount,
  avatarSize = 64,
  containerStyle,
}: ProfileIdentityCardProps) {
  const handle =
    username !== null && username.length > 0 ? `@${username}` : null;

  return (
    <View style={[styles.identityCard, containerStyle]}>
      <ProfileAvatar name={name} avatarUrl={avatarUrl} size={avatarSize} />
      <View style={styles.identityMeta}>
        <Text style={styles.identityName} numberOfLines={1}>
          {name}
        </Text>
        {handle !== null ? (
          <Text style={styles.identityHandle} numberOfLines={1}>
            {handle}
          </Text>
        ) : null}
        {badge ?? null}
      </View>
      <RatingRing value={rating} reviewCount={reviewCount} size={80} />
    </View>
  );
}

export function ProfileOrganizerBadge() {
  return (
    <View style={styles.organizerBadge}>
      <Ionicons name="megaphone-outline" size={12} color={PROFILE_COLORS.primaryHi} />
      <Text style={styles.organizerBadgeText}>Post organizer</Text>
    </View>
  );
}

// ── Metric strip ──────────────────────────────────────────────────────────────

export type ProfileMetricStripData = {
  category: PadelCategoryNumber | null;
  reliabilityValue: string;
  reliabilityCaption: string;
  reliabilityLow: boolean;
  matchesPlayed: number;
};

type MetricCellProps = {
  label: string;
  value: string;
  caption: string;
  valueColor?: string;
  onPress?: () => void;
  showDivider: boolean;
};

function MetricCell({
  label,
  value,
  caption,
  valueColor,
  onPress,
  showDivider,
}: MetricCellProps) {
  const content = (
    <>
      {showDivider ? <View style={styles.metricDivider} /> : null}
      <View style={styles.metricCellInner}>
        <Text style={styles.metricLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text
          style={[styles.metricValue, valueColor !== undefined ? { color: valueColor } : undefined]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {value}
        </Text>
        <Text
          style={styles.metricCaption}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {caption}
        </Text>
      </View>
    </>
  );

  if (onPress !== undefined) {
    return (
      <Pressable
        onPress={onPress}
        style={styles.metricCell}
        className="active:opacity-85"
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.metricCell}>{content}</View>;
}

type ProfileMetricStripProps = {
  data: ProfileMetricStripData;
  onLevelPress: () => void;
  onStatsHelpPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ProfileMetricStrip({
  data,
  onLevelPress,
  onStatsHelpPress,
  containerStyle,
}: ProfileMetricStripProps) {
  const levelValue =
    data.category !== null ? formatCategoryLabel(data.category) : '—';
  const levelCaption =
    data.category !== null
      ? TIER_STRIP_CAPTION[categoryToTier(data.category)]
      : 'Not set';

  return (
    <View style={containerStyle}>
      <View style={styles.metricStrip}>
        <MetricCell
          label="LEVEL"
          value={levelValue}
          caption={levelCaption}
          onPress={data.category !== null ? onLevelPress : undefined}
          showDivider={false}
        />
        <MetricCell
          label="RELIABLE"
          value={data.reliabilityValue}
          caption={data.reliabilityCaption}
          valueColor={data.reliabilityLow ? PROFILE_COLORS.warning : undefined}
          showDivider
        />
        <MetricCell
          label="MATCHES"
          value={String(data.matchesPlayed)}
          caption="played"
          showDivider
        />
      </View>
      <Pressable
        onPress={onStatsHelpPress}
        hitSlop={8}
        className="active:opacity-70"
        style={styles.statsFooterLink}
        accessibilityRole="button"
      >
        <Text style={styles.statsFooterText}>How stats work</Text>
      </Pressable>
    </View>
  );
}

export function formatReliabilityStripCaption(commitmentCount: number): string {
  if (hasPublicReliabilitySample(commitmentCount)) {
    return 'Established';
  }
  return `${commitmentCount}/${MIN_RELIABILITY_COMMITMENTS} matches`;
}

// ── List sections ─────────────────────────────────────────────────────────────

type ProfileListSectionProps = {
  title: string;
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ProfileListSection({ title, children, containerStyle }: ProfileListSectionProps) {
  return (
    <View style={[styles.listSection, containerStyle]}>
      <Text style={styles.listSectionTitle}>{title}</Text>
      <View style={styles.listGroup}>{children}</View>
    </View>
  );
}

type ProfileListRowProps = {
  label: string;
  value: string;
  isFirst?: boolean;
  onPress?: () => void;
  placeholder?: boolean;
};

export function ProfileListRow({
  label,
  value,
  isFirst = false,
  onPress,
  placeholder = false,
}: ProfileListRowProps) {
  const row = (
    <View style={[styles.listRow, !isFirst && styles.listRowBorder]}>
      <Text style={styles.listRowLabel}>{label}</Text>
      <View style={styles.listRowRight}>
        {value.length > 0 ? (
          <Text
            style={[
              styles.listRowValue,
              placeholder ? { color: PROFILE_COLORS.primaryHi } : undefined,
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {onPress !== undefined ? (
          <Ionicons name="chevron-forward" size={16} color={PROFILE_COLORS.faint} />
        ) : null}
      </View>
    </View>
  );

  if (onPress !== undefined) {
    return (
      <Pressable onPress={onPress} className="active:opacity-85">
        {row}
      </Pressable>
    );
  }

  return row;
}

// ── Playing rows ──────────────────────────────────────────────────────────────

export type PlayingRowData = {
  label: string;
  value: string;
  missing: boolean;
};

function resolveHandValue(parts: PlayingProfileParts): { value: string; missing: boolean } {
  if (parts.dominantHand === null || parts.dominantHand === 'unspecified') {
    return { value: '—', missing: true };
  }
  const label = formatDominantHandLabel(parts.dominantHand);
  return { value: label ?? '—', missing: label === null };
}

function resolveSideValue(parts: PlayingProfileParts): { value: string; missing: boolean } {
  if (parts.courtSide === null) {
    return { value: '—', missing: true };
  }
  if (parts.courtSide === 'any') {
    return { value: 'Either side', missing: false };
  }
  return { value: formatPositionLabel(parts.courtSide), missing: false };
}

function resolveExperienceValue(parts: PlayingProfileParts): { value: string; missing: boolean } {
  if (parts.yearsPlaying === null || parts.yearsPlaying <= 0) {
    return { value: '—', missing: true };
  }
  const years = parts.yearsPlaying;
  return { value: years === 1 ? '1 year' : `${years} years`, missing: false };
}

export function buildPlayingRows(parts: PlayingProfileParts): PlayingRowData[] {
  const side = resolveSideValue(parts);
  const hand = resolveHandValue(parts);
  const experience = resolveExperienceValue(parts);
  return [
    { label: 'Side', ...side },
    { label: 'Hand', ...hand },
    { label: 'Experience', ...experience },
  ];
}

export function playingSectionHasAnyData(parts: PlayingProfileParts): boolean {
  return buildPlayingRows(parts).some((row) => !row.missing);
}

// ── Highlights ────────────────────────────────────────────────────────────────

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

// ── Utilities (legacy formatters) ─────────────────────────────────────────────

export function formatMemberSince(isoDate: string | null): string | null {
  if (isoDate === null) return null;
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return null;
  const date = new Date(timestamp);
  const month = date.toLocaleString('en', { month: 'short' });
  const year = date.getFullYear();
  return `Member since ${month} ${year}`;
}

/** @deprecated Use formatProfileJoinedLabel for list rows. */
export function formatMemberSinceStatParts(isoDate: string | null): {
  value: string;
  caption: string;
} {
  if (isoDate === null || isoDate.length === 0) {
    return { value: '—', caption: '—' };
  }
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return { value: '—', caption: '—' };
  }
  const date = new Date(timestamp);
  const month = date.toLocaleString('en', { month: 'short' });
  const year = date.getFullYear();
  return {
    value: `${month} ${String(year).slice(-2)}`,
    caption: String(year),
  };
}

/** @deprecated Use formatReliabilityStripCaption. */
export function formatReliabilityStatCaption(commitmentCount: number): string {
  return formatReliabilityStripCaption(commitmentCount);
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  skillBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 17,
    color: PROFILE_COLORS.neutral,
  },
  heroHandle: {
    fontFamily: 'Space Mono',
    fontSize: 12,
    color: PROFILE_COLORS.dim,
    letterSpacing: 0.3,
  },
  identityCard: {
    backgroundColor: PROFILE_COLORS.surface1,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.hair,
    borderRadius: PROFILE_LAYOUT.identityCardRadius,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    color: PROFILE_COLORS.neutral,
  },
  identityHandle: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    color: PROFILE_COLORS.dim,
    letterSpacing: 0.5,
  },
  ratingRingWrap: {
    alignItems: 'center',
    flexShrink: 0,
    maxWidth: 88,
  },
  ringCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 18,
    color: PROFILE_COLORS.neutral,
    lineHeight: 22,
  },
  ringLabel: {
    fontFamily: 'Space Mono',
    fontSize: 7.5,
    color: PROFILE_COLORS.dim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  ringReviewCaption: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 9,
    lineHeight: 12,
    color: PROFILE_COLORS.faint,
    textAlign: 'center',
    marginTop: 3,
    maxWidth: 88,
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(94,112,184,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(94,112,184,0.25)',
  },
  organizerBadgeText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 11,
    fontWeight: '600',
    color: PROFILE_COLORS.primaryHi,
  },
  metricStrip: {
    flexDirection: 'row',
    backgroundColor: PROFILE_COLORS.surface1,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.hair,
    borderRadius: PROFILE_LAYOUT.groupRadius,
    overflow: 'hidden',
  },
  metricCell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 72,
  },
  metricDivider: {
    width: 1,
    backgroundColor: PROFILE_COLORS.hair2,
    alignSelf: 'stretch',
  },
  metricCellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  metricLabel: {
    fontFamily: 'Space Mono',
    fontSize: 9,
    letterSpacing: 0.8,
    color: PROFILE_COLORS.faint,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 17,
    color: PROFILE_COLORS.neutral,
  },
  metricCaption: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 11,
    color: PROFILE_COLORS.faint,
    textAlign: 'center',
  },
  statsFooterLink: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 2,
  },
  statsFooterText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    color: PROFILE_COLORS.primaryHi,
  },
  listSection: {
    gap: PROFILE_LAYOUT.labelGap,
  },
  listSectionTitle: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.5,
    color: PROFILE_COLORS.faint,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  listGroup: {
    backgroundColor: PROFILE_COLORS.surface1,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.hair,
    borderRadius: PROFILE_LAYOUT.groupRadius,
    overflow: 'hidden',
  },
  listRow: {
    minHeight: PROFILE_LAYOUT.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PROFILE_COLORS.hair2,
    marginLeft: 16,
    paddingLeft: 0,
  },
  listRowLabel: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: PROFILE_COLORS.neutral,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: '58%',
  },
  listRowValue: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    color: PROFILE_COLORS.dim,
    textAlign: 'right',
    flexShrink: 1,
  },
  highlightChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
