import { useState } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { Image } from 'expo-image';
import { Pressable, Text, View } from '@/tw';
import {
  formatPostDistanceKm,
  formatPostEventSchedule,
  formatPostTypeLine,
} from '@/features/community/post-display';
import { PostEventDetailSections } from '@/features/community/components/post-event-detail-sections';
import { PostFlyerImage } from '@/features/community/components/post-flyer-image';
import { PostImageViewer } from '@/features/community/components/post-image-viewer';
import { buildPostImageUrl } from '@/lib/post-storage';
import type { PostSummary } from '@/features/community/use-posts';

const C = {
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
} as const;

type PostDetailContentProps = {
  post: PostSummary;
  localFlyerUri?: string | null;
  distanceM?: number;
  headerPaddingHorizontal?: number;
};

export function PostDetailContent({
  post,
  localFlyerUri = null,
  distanceM,
  headerPaddingHorizontal = 20,
}: PostDetailContentProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const remoteImageUrl = buildPostImageUrl(post.image_path);
  const hasLocalFlyer = localFlyerUri !== null && localFlyerUri.length > 0;

  return (
    <RNView>
      <Text
        className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38"
        style={{ paddingLeft: headerPaddingHorizontal + 56, marginBottom: 4, height: 44, lineHeight: 44 }}
      >
        {formatPostTypeLine(post.type, post.subtype, post.subtype_note).toUpperCase()}
      </Text>

      <Text
        className="font-grotesk font-extrabold text-[30px] text-neutral"
        style={{ letterSpacing: -0.8, paddingHorizontal: headerPaddingHorizontal }}
      >
        {post.title}
      </Text>

      {hasLocalFlyer ? (
        <RNView style={{ marginTop: 16, paddingHorizontal: headerPaddingHorizontal }}>
          <PressableFlyer uri={localFlyerUri} onPress={() => setViewerOpen(true)} />
          <PostImageViewer visible={viewerOpen} uri={localFlyerUri} onClose={() => setViewerOpen(false)} />
        </RNView>
      ) : remoteImageUrl !== null ? (
        <RNView style={{ marginTop: 16, paddingHorizontal: headerPaddingHorizontal }}>
          <PostFlyerImage uri={remoteImageUrl} variant="hero" onPress={() => setViewerOpen(true)} />
          <PostImageViewer visible={viewerOpen} uri={remoteImageUrl} onClose={() => setViewerOpen(false)} />
        </RNView>
      ) : null}

      <View style={[styles.section, { paddingHorizontal: headerPaddingHorizontal }]}>
        <Text style={styles.sectionLabel}>When</Text>
        <Text style={styles.sectionValue}>
          {formatPostEventSchedule(post.event_start, post.event_end)}
        </Text>
      </View>

      <View style={[styles.section, { paddingHorizontal: headerPaddingHorizontal }]}>
        <Text style={styles.sectionLabel}>Where</Text>
        <Text style={styles.sectionValue}>
          {post.venue_name ?? post.formatted_address ?? 'See post image'}
        </Text>
        {post.formatted_address !== null && post.venue_name !== null ? (
          <Text style={styles.sectionHint}>{post.formatted_address}</Text>
        ) : null}
        {distanceM !== undefined ? (
          <Text style={styles.sectionHint}>{formatPostDistanceKm(distanceM)} away</Text>
        ) : null}
      </View>

      {post.description !== null && post.description.length > 0 ? (
        <View style={[styles.section, { paddingHorizontal: headerPaddingHorizontal }]}>
          <Text style={styles.sectionLabel}>Details</Text>
          <Text style={styles.sectionBody}>{post.description}</Text>
        </View>
      ) : null}

      <PostEventDetailSections post={post} />
    </RNView>
  );
}

function PressableFlyer({ uri, onPress }: { uri: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.localHero}>
      <Image source={{ uri }} style={styles.localHeroImage} contentFit="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 20,
    gap: 6,
  },
  sectionLabel: {
    color: C.faint,
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionValue: {
    color: C.mist,
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHint: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
  },
  sectionBody: {
    color: C.dim,
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    lineHeight: 22,
  },
  localHero: {
    width: '100%',
    minHeight: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
  },
  localHeroImage: {
    width: '100%',
    height: 280,
  },
});
