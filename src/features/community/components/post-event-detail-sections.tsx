import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View, Text } from '@/tw';
import {
  POST_TAG_LABELS,
  TAG_GROUPS,
  formatDivision,
  formatPostFee,
  formatRegistrationDeadline,
  formatScoring,
} from '@/features/community/post-display';
import { PostFlyerImage } from '@/features/community/components/post-flyer-image';
import { PostImageViewer } from '@/features/community/components/post-image-viewer';
import { buildPostImageUrl } from '@/lib/post-storage';
import type { PostDetail } from '@/features/community/use-posts';

const C = {
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
} as const;

export function PostEventDetailSections({ post }: { post: PostDetail }) {
  const [rulesViewerUri, setRulesViewerUri] = useState<string | null>(null);

  const feeLine = formatPostFee(post.entry_fee, post.fee_unit, post.divisions.length > 0);
  const scoringLine = formatScoring(
    post.scoring_format,
    post.golden_point,
    post.guaranteed_matches,
  );
  const registrationLine = formatRegistrationDeadline(post.registration_deadline);
  const rulesImageUrls = post.rules_image_paths
    .map((path) => buildPostImageUrl(path))
    .filter((url): url is string => url !== null);

  const hasTags = post.tags.length > 0;
  const hasDivisions = post.divisions.length > 0;
  const hasScoring =
    scoringLine !== null ||
    (post.rules_note !== null && post.rules_note.length > 0) ||
    rulesImageUrls.length > 0;

  if (!hasDivisions && feeLine === null && registrationLine === null && !hasScoring && !hasTags) {
    return null;
  }

  return (
    <>
      {hasDivisions ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Divisions</Text>
          {post.divisions.map((division) => (
            <Text key={division.id} style={styles.sectionValue}>
              {formatDivision(division)}
            </Text>
          ))}
        </View>
      ) : null}

      {feeLine !== null || registrationLine !== null ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Registration</Text>
          {feeLine !== null ? <Text style={styles.sectionValue}>{feeLine}</Text> : null}
          {registrationLine !== null ? (
            <Text style={styles.sectionHint}>Register by {registrationLine}</Text>
          ) : null}
        </View>
      ) : null}

      {hasScoring ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Format & rules</Text>
          {scoringLine !== null ? <Text style={styles.sectionValue}>{scoringLine}</Text> : null}
          {post.rules_note !== null && post.rules_note.length > 0 ? (
            <Text style={styles.sectionBody}>{post.rules_note}</Text>
          ) : null}
          {rulesImageUrls.length > 0 ? (
            <View style={styles.rulesRow}>
              {rulesImageUrls.map((uri) => (
                <Pressable key={uri} onPress={() => setRulesViewerUri(uri)} style={styles.rulesThumb}>
                  <PostFlyerImage
                    uri={uri}
                    variant="preview"
                    onPress={() => setRulesViewerUri(uri)}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {hasTags ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Included</Text>
          {TAG_GROUPS.map((group) => {
            const activeTags = group.tags.filter((tag) => post.tags.includes(tag));
            if (activeTags.length === 0) return null;
            return (
              <View key={group.id} style={styles.tagGroup}>
                <Text style={styles.sectionHint}>{group.label}</Text>
                <Text style={styles.sectionBody}>
                  {activeTags.map((tag) => POST_TAG_LABELS[tag]).join(' · ')}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {rulesViewerUri !== null ? (
        <PostImageViewer
          visible
          uri={rulesViewerUri}
          onClose={() => setRulesViewerUri(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 6,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.faint,
  },
  sectionValue: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    color: C.mist,
    lineHeight: 22,
  },
  sectionBody: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    color: C.dim,
  },
  sectionHint: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    color: C.faint,
  },
  rulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rulesThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tagGroup: {
    gap: 4,
    marginTop: 4,
  },
});
