import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import { formatDiscoverMatchWhen, formatMatchTimeRange } from '@/lib/match-time';
import {
  formatCategoryCompact,
  formatDistanceKm,
  formatMatchDurationHours,
} from '@/features/matches/match-display';
import type { MatchSummary } from '@/features/matches/use-matches';

const C = {
  surface1: '#141417',
  surface2: '#1B1C21',
  surface3: '#232429',
  blueHi: '#7C8FE8',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  ink: '#0B0B0B',
} as const;

export const MAP_MATCH_CARD_GAP = 14;

type MapMatchCardProps = {
  match: MatchSummary;
  width: number;
  selected: boolean;
  onPress: () => void;
};

export function MapMatchCard({ match, width, selected, onPress }: MapMatchCardProps) {
  const { day } = formatDiscoverMatchWhen(match.starts_at);
  const timeRange = formatMatchTimeRange(match.starts_at, match.duration_minutes);
  const durationLabel = formatMatchDurationHours(match.duration_minutes);
  const categoryLabel = formatCategoryCompact(match.category_max, match.category_min);
  const filled = match.totalFilled;
  const full = match.isJoinFull || match.status === 'full';
  const distanceLabel =
    match.distanceM !== undefined ? formatDistanceKm(match.distanceM) : null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { width }, selected && styles.cardSelected]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {match.venue_name ?? match.title}
        </Text>
        {distanceLabel !== null ? (
          <View style={styles.distancePill}>
            <Ionicons name="location-outline" size={12} color={C.blueHi} />
            <Text style={styles.distanceText}>{distanceLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.scheduleRow}>
        <Ionicons name="calendar-outline" size={13} color={C.faint} />
        <Text style={styles.schedule} numberOfLines={1}>
          {day} · {timeRange} · {durationLabel}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
          <Text style={[styles.players, full && styles.playersFull]}>
            {filled}/{match.capacity} {full ? 'Full' : 'Players'}
          </Text>
        </View>
        <View style={styles.viewCta}>
          <Text style={styles.viewCtaText}>View</Text>
          <Ionicons name="chevron-forward" size={14} color={C.mist} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: C.ink,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardSelected: {
    borderColor: 'rgba(124,143,232,0.55)',
    backgroundColor: '#171922',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16.5,
    color: C.mist,
    letterSpacing: -0.2,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  distanceText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: C.mist,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  schedule: {
    flex: 1,
    fontFamily: 'Space Mono',
    fontSize: 11,
    letterSpacing: 0.4,
    color: C.dim,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  categoryChip: {
    backgroundColor: 'rgba(124,143,232,0.18)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  categoryText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: '#B4C0EC',
    textTransform: 'uppercase',
  },
  players: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.dim,
    textTransform: 'uppercase',
  },
  playersFull: {
    color: C.faint,
  },
  viewCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: C.surface3,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
  },
  viewCtaText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.mist,
  },
});
