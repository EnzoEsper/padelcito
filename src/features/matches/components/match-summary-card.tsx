import { memo, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View, Text } from '@/tw';
import { formatDiscoverMatchWhen, formatMatchTimeRange } from '@/lib/match-time';
import {
  categoryAccentLevel,
  formatCategoryCompact,
  formatDifficultyLabel,
  formatDistanceKm,
  formatGenderLabel,
  formatMatchDurationHours,
  type CategoryAccentLevel,
} from '@/features/matches/match-display';
import type { MatchSummary } from '@/features/matches/use-matches';

const C = {
  surface1: '#141417',
  surface2: '#1B1C21',
  surface3: '#232429',
  blue: '#2B396D',
  blueMid: '#5E70B8',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  ghost: 'rgba(228,228,228,0.20)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  warning: '#E0B15B',
} as const;

const AVATAR_TONES: [string, string][] = [
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#E4E4E4'],
  ['#202126', '#E4E4E4'],
  ['#4458A6', '#0B0B0B'],
  ['#2A2B30', '#E4E4E4'],
];

function accentColorsForLevel(level: CategoryAccentLevel): readonly [string, string] {
  if (level === 'high') return [C.blueHi, C.blueMid];
  if (level === 'mid') return [C.blueMid, C.blue];
  return [C.surface3, 'rgba(228,228,228,0.18)'];
}

function playerInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function AvatarBubble({ name, index }: { name: string; index: number }) {
  const tone = AVATAR_TONES[index % AVATAR_TONES.length] ?? AVATAR_TONES[0];

  return (
    <View
      style={[
        styles.avatarBubble,
        {
          backgroundColor: tone[0],
          marginLeft: index === 0 ? 0 : -10,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: tone[1] }]}>{playerInitials(name)}</Text>
    </View>
  );
}

function EmptySpot({ index }: { index: number }) {
  return (
    <View style={[styles.emptySpot, { marginLeft: index === 0 ? 0 : -10 }]}>
      <Ionicons name="add" size={13} color={C.faint} />
    </View>
  );
}

function MatchMetaChip({
  label,
  variant,
}: {
  label: string;
  variant: 'category' | 'default' | 'muted';
}) {
  return (
    <View
      style={[
        styles.metaChip,
        variant === 'category' && styles.metaChipCategory,
        variant === 'default' && styles.metaChipDefault,
        variant === 'muted' && styles.metaChipMuted,
      ]}
    >
      <Text
        style={[
          styles.metaChipText,
          variant === 'category' && styles.metaChipTextCategory,
          variant === 'default' && styles.metaChipTextDefault,
          variant === 'muted' && styles.metaChipTextMuted,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export type MatchSummaryCardProps = {
  match: MatchSummary;
  onPress: () => void;
  /** When set, shows the distance pill (discover feed). */
  distanceM?: number;
  muted?: boolean;
  /** Header corner badges (matches calendar tabs). */
  headerBadge?: ReactNode;
  /** Footer membership label left of player count (matches calendar tabs). */
  footerMembership?: ReactNode;
  rateAction?: { onPress: () => void };
};

export const MatchSummaryCard = memo(function MatchSummaryCard({
  match,
  onPress,
  distanceM,
  muted = false,
  headerBadge,
  footerMembership,
  rateAction,
}: MatchSummaryCardProps) {
  const hostName = match.host?.display_name ?? 'Player';
  const { day } = formatDiscoverMatchWhen(match.starts_at);
  const timeRange = formatMatchTimeRange(match.starts_at, match.duration_minutes);
  const durationLabel = formatMatchDurationHours(match.duration_minutes);
  const categoryLabel = formatCategoryCompact(match.category_max, match.category_min);
  const filled = match.totalFilled;
  const openSpots = match.joinSpotsRemaining;
  const accentLevel = categoryAccentLevel(match.category_max);
  const full = match.isJoinFull || match.status === 'full';
  const avatarNames = [hostName, match.sport?.name ?? 'Player', match.venue_name ?? 'Match'];
  const showDistance = distanceM !== undefined;

  return (
    <Pressable onPress={onPress} style={[styles.card, muted && styles.cardMuted]}>
      <LinearGradient
        colors={accentColorsForLevel(accentLevel)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardAccent}
      />

      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {match.venue_name ?? match.title}
          </Text>
          {showDistance ? (
            <View style={styles.headerCorner}>
              <View style={styles.distancePill}>
                <Ionicons name="location-outline" size={12} color={C.blueHi} />
                <Text style={styles.distanceText}>{formatDistanceKm(distanceM)}</Text>
              </View>
            </View>
          ) : headerBadge !== undefined ? (
            <View style={styles.headerCorner}>{headerBadge}</View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={C.faint} style={styles.metaIcon} />
          <Text style={styles.metaScheduleText} numberOfLines={1}>
            <Text style={styles.metaText}>{day} · </Text>
            <Text style={styles.metaMono}>{timeRange}</Text>
          </Text>
          <View style={styles.metaDurationGap} />
          <Ionicons name="time-outline" size={13} color={C.faint} style={styles.metaIcon} />
          <Text style={styles.metaMono}>{durationLabel}</Text>
        </View>
        <View style={styles.matchMetaChips}>
          <MatchMetaChip label={categoryLabel} variant="category" />
          <MatchMetaChip label={formatGenderLabel(match.gender_preference)} variant="default" />
          <MatchMetaChip label={formatDifficultyLabel(match.difficulty)} variant="muted" />
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.playersWrap}>
          <View style={styles.avatarStack}>
            {avatarNames.slice(0, Math.min(filled, 3)).map((name, index) => (
              <AvatarBubble key={`${match.id}-${name}-${index}`} name={name} index={index} />
            ))}
            {Array.from({ length: Math.min(openSpots, 2) }).map((_, index) => (
              <EmptySpot key={`${match.id}-empty-${index}`} index={filled + index} />
            ))}
          </View>
          <View>
            <Text style={[styles.playerCount, full && styles.playerCountFull]}>
              {filled}
              <Text style={styles.playerTotal}>/{match.capacity}</Text>
            </Text>
            <Text style={styles.playerLabel}>{full ? 'Full' : 'Players'}</Text>
          </View>
          {footerMembership !== undefined ? (
            <View style={styles.footerMembership}>{footerMembership}</View>
          ) : null}
        </View>

        <View style={styles.footerActions}>
          {rateAction !== undefined ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                rateAction.onPress();
              }}
              style={styles.rateButton}
            >
              <Text style={styles.rateButtonText}>Rate</Text>
            </Pressable>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={C.ghost} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cardMuted: {
    opacity: 0.9,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderRadius: 3,
  },
  cardHeader: {
    paddingLeft: 4,
    gap: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 5,
  },
  headerCorner: {
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16.5,
    color: C.mist,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    minWidth: 0,
  },
  metaIcon: {
    flexShrink: 0,
    marginRight: 6,
  },
  metaScheduleText: {
    flexShrink: 1,
    minWidth: 0,
  },
  metaDurationGap: {
    width: 10,
    flexShrink: 0,
  },
  matchMetaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  metaChip: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaChipCategory: {
    backgroundColor: 'rgba(68,88,166,0.18)',
  },
  metaChipDefault: {
    backgroundColor: C.surface3,
  },
  metaChipMuted: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.hair,
  },
  metaChipText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaChipTextCategory: {
    color: '#A9B6E6',
  },
  metaChipTextDefault: {
    color: C.dim,
  },
  metaChipTextMuted: {
    color: C.faint,
  },
  metaText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 13,
    color: C.dim,
  },
  metaMono: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.dim,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface3,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexShrink: 0,
  },
  distanceText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.mist,
  },
  cardDivider: {
    height: 1,
    backgroundColor: C.hair2,
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
  },
  playersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flexShrink: 1,
  },
  footerMembership: {
    marginLeft: 8,
    flexShrink: 0,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.surface1,
  },
  avatarText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  emptySpot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.ghost,
    backgroundColor: C.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCount: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    color: C.mist,
  },
  playerCountFull: {
    color: C.dim,
  },
  playerTotal: {
    color: C.dim,
  },
  playerLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9.5,
    letterSpacing: 1,
    color: C.dim,
    textTransform: 'uppercase',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rateButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(116,136,216,0.30)',
    backgroundColor: 'rgba(43,57,109,0.20)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rateButtonText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.blueHi,
  },
});
