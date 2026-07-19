import { Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import {
  POST_STATUS_COLORS,
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
  formatPostDistanceKm,
  formatPostEventSchedule,
  isPostContactVerified,
} from '@/features/community/post-display';
import { buildPostImageUrl } from '@/lib/post-storage';
import type { PostSummary } from '@/features/community/use-posts';

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

type PostSummaryCardProps = {
  post: PostSummary;
  onPress: () => void;
  showStatus?: boolean;
};

export function PostSummaryCard({ post, onPress, showStatus = false }: PostSummaryCardProps) {
  const imageUrl = buildPostImageUrl(post.image_path);
  const distanceLabel = formatPostDistanceKm(post.distanceM);
  const scheduleLabel = formatPostEventSchedule(post.event_start, post.event_end);
  const verified = isPostContactVerified(post.contact_verified_at);
  const statusColors = POST_STATUS_COLORS[post.status];

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
          <View style={styles.metaLeft}>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{POST_TYPE_LABELS[post.type]}</Text>
            </View>
            {showStatus ? (
              <View style={[styles.statusChip, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusChipText, { color: statusColors.fg }]}>
                  {POST_STATUS_LABELS[post.status]}
                </Text>
              </View>
            ) : null}
          </View>
          {distanceLabel !== null ? (
            <Text style={styles.distanceText}>{distanceLabel}</Text>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>

        <Text style={styles.schedule} numberOfLines={1}>
          {scheduleLabel}
        </Text>

        <Text style={styles.venue} numberOfLines={1}>
          {post.venue_name ?? post.formatted_address ?? 'Location on post'}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.author} numberOfLines={1}>
            {post.author?.display_name ?? 'Organizer'}
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
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
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
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: {
    fontFamily: 'Space Mono',
    fontSize: 9,
    letterSpacing: 0.5,
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
