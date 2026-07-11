import { Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import {
  FLYER_TYPE_LABELS,
  formatFlyerDistanceKm,
  formatFlyerEventSchedule,
  isFlyerContactVerified,
} from '@/features/community/flyer-display';
import { buildFlyerImageUrl } from '@/lib/flyer-storage';
import type { FlyerSummary } from '@/features/community/use-flyers';

const C = {
  surface1: '#141417',
  surface2: '#1B1C21',
  surface3: '#232429',
  blueMid: '#5E70B8',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  success: '#5BE0A6',
} as const;

type FlyerSummaryCardProps = {
  flyer: FlyerSummary;
  onPress: () => void;
};

export function FlyerSummaryCard({ flyer, onPress }: FlyerSummaryCardProps) {
  const imageUrl = buildFlyerImageUrl(flyer.image_path);
  const distanceLabel = formatFlyerDistanceKm(flyer.distanceM);
  const scheduleLabel = formatFlyerEventSchedule(flyer.event_start, flyer.event_end);
  const verified = isFlyerContactVerified(flyer.contact_verified_at);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {imageUrl !== null ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={28} color={C.faint} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>{FLYER_TYPE_LABELS[flyer.type]}</Text>
          </View>
          {distanceLabel !== null ? (
            <Text style={styles.distanceText}>{distanceLabel}</Text>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {flyer.title}
        </Text>

        <Text style={styles.schedule} numberOfLines={1}>
          {scheduleLabel}
        </Text>

        <Text style={styles.venue} numberOfLines={1}>
          {flyer.venue_name ?? flyer.formatted_address ?? 'Location on flyer'}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.author} numberOfLines={1}>
            {flyer.author?.display_name ?? 'Organizer'}
          </Text>
          {verified ? (
            <View style={styles.verifiedChip}>
              <Ionicons name="shield-checkmark" size={12} color={C.success} />
              <Text style={styles.verifiedText}>Verified contact</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.hair,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 168,
    backgroundColor: C.surface2,
  },
  imagePlaceholder: {
    width: '100%',
    height: 168,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeChip: {
    backgroundColor: 'rgba(94,112,184,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeChipText: {
    color: C.blueMid,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  distanceText: {
    color: C.faint,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  title: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  schedule: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
  },
  venue: {
    color: C.faint,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  author: {
    color: C.faint,
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    flex: 1,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: C.success,
    fontFamily: 'Space Mono',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
