import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from '@/tw';
import { useProfile } from '@/features/profile/use-profile';
import { usePublicProfile } from '@/features/profile/use-public-profile';
import { usePublicProfileStats } from '@/features/profile/use-public-profile-stats';
import {
  buildPlayingRows,
  playingSectionHasAnyData,
  ProfileIdentityCard,
  ProfileWhatsAppVerifiedBadge,
  ProfileListRow,
  ProfileListSection,
  ProfileMetricStrip,
  ProfileOrganizerBadge,
  formatReliabilityStripCaption,
  PROFILE_COLORS as C,
  PROFILE_LAYOUT as L,
  QualityHighlightChip,
} from '@/features/profile/profile-display';
import { PadelLevelSheet } from '@/features/profile/padel-level-sheet';
import { ProfileStatsInfoSheet } from '@/features/profile/profile-stats-info-sheet';
import {
  formatReliabilityScore,
  isLowReliability,
} from '@/features/ratings/penalty-report';
import {
  formatProfileAgeLabel,
  formatProfileGenderLabel,
  formatProfileJoinedLabel,
} from '@/lib/profile-demographics';
import { resolvePlayerProfileReturnRoute } from '@/features/safety/safety-display';
import { useUserActionsSheet } from '@/features/safety/user-actions-sheet';
import { SCREEN_PADDING } from '@/components/stack-screen-layout';

const BACK_BUTTON_SIZE = 44;

function parseRouteParam(value: string | string[] | undefined): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value.length > 0 ? value : null;
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

  const [statsInfoOpen, setStatsInfoOpen] = useState(false);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);

  const ownProfileQuery = useProfile();
  const publicProfileQuery = usePublicProfile(userId);
  const publicStatsQuery = usePublicProfileStats(userId);
  const { open: openUserActions, sheet: userActionsSheet } = useUserActionsSheet();

  const headerTop = insets.top + 16;
  const isSelf = ownProfileQuery.data?.id === userId;
  const profile = publicProfileQuery.data;
  const displayName = profile?.display_name ?? 'Player';

  const highlightTags = useMemo(() => {
    const counts = publicStatsQuery.data?.qualityTagCounts ?? {};
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
  }, [publicStatsQuery.data?.qualityTagCounts]);

  const mutualCount = publicStatsQuery.data?.mutualFinishedCount ?? 0;

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

  const showOrganizerBadge = postId !== null && matchId === null;

  const bioText =
    profile?.bio !== null && profile?.bio !== undefined && profile.bio.trim().length > 0
      ? profile.bio.trim()
      : null;

  const playingParts =
    profile !== undefined && profile !== null
      ? {
          dominantHand: profile.dominant_hand,
          courtSide: profile.court_side_preference,
          yearsPlaying: profile.years_playing,
        }
      : { dominantHand: null, courtSide: null, yearsPlaying: null };

  const showPlayingSection = playingSectionHasAnyData(playingParts);
  const playingRows = buildPlayingRows(playingParts);

  const detailRows = useMemo(() => {
    if (profile === undefined || profile === null) {
      return [];
    }
    const rows: { key: string; label: string; value: string }[] = [];
    const age = formatProfileAgeLabel(profile.age_years);
    if (age !== null) {
      rows.push({ key: 'age', label: 'Age', value: age });
    }
    const gender = formatProfileGenderLabel(profile.gender);
    if (gender !== null) {
      rows.push({ key: 'gender', label: 'Gender', value: gender });
    }
    const joined = formatProfileJoinedLabel(profile.created_at);
    if (joined !== null) {
      rows.push({ key: 'joined', label: 'Joined', value: joined });
    }
    if (mutualCount > 0 && !isSelf) {
      rows.push({
        key: 'mutual',
        label: 'Played together',
        value: `${mutualCount} time${mutualCount === 1 ? '' : 's'}`,
      });
    }
    return rows;
  }, [profile, mutualCount, isSelf]);

  const reliabilityLow =
    profile !== undefined && profile !== null
      ? isLowReliability(
          profile.reliability_score,
          profile.penalty_count,
          profile.commitment_count,
        )
      : false;

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
          paddingTop: headerTop + BACK_BUTTON_SIZE + 8,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: SCREEN_PADDING,
        }}
        showsVerticalScrollIndicator={false}
      >
        {publicProfileQuery.isPending ? (
          <ActivityIndicator color={C.neutral} style={styles.loader} />
        ) : profile === undefined || profile === null ? (
          <Text style={styles.emptyText}>This player profile is not available.</Text>
        ) : (
          <View style={styles.body}>
            <ProfileIdentityCard
              name={profile.display_name}
              username={profile.username}
              avatarUrl={profile.avatar_url}
              nameTrailing={
                profile.whatsapp_verified ? <ProfileWhatsAppVerifiedBadge /> : null
              }
              badge={showOrganizerBadge ? <ProfileOrganizerBadge /> : undefined}
              rating={profile.rating_avg ?? 0}
              reviewCount={profile.rating_count}
              avatarSize={72}
            />

            <ProfileMetricStrip
              data={{
                category: profile.padel_category,
                reliabilityValue: formatReliabilityScore(
                  profile.reliability_score,
                  profile.commitment_count,
                ),
                reliabilityCaption: formatReliabilityStripCaption(profile.commitment_count),
                reliabilityLow,
                matchesPlayed: publicStatsQuery.data?.matchesFinishedCount ?? 0,
              }}
              onLevelPress={() => setLevelSheetOpen(true)}
              onStatsHelpPress={() => setStatsInfoOpen(true)}
            />

            {showPlayingSection ? (
              <ProfileListSection title="PLAYING STYLE">
                {playingRows
                  .filter((row) => !row.missing)
                  .map((row, index) => (
                    <ProfileListRow
                      key={row.label}
                      label={row.label}
                      value={row.value}
                      isFirst={index === 0}
                    />
                  ))}
              </ProfileListSection>
            ) : null}

            {highlightTags.length > 0 ? (
              <View style={styles.highlightsBlock}>
                <Text style={styles.sectionTitle}>HIGHLIGHTS</Text>
                <View style={styles.highlightRow}>
                  {highlightTags.map((tag) => (
                    <QualityHighlightChip key={tag} label={tag} />
                  ))}
                </View>
              </View>
            ) : null}

            {bioText !== null ? (
              <View style={styles.aboutBlock}>
                <Text style={styles.sectionTitle}>ABOUT</Text>
                <Text style={styles.aboutText}>{bioText}</Text>
              </View>
            ) : null}

            {detailRows.length > 0 ? (
              <ProfileListSection title="DETAILS">
                {detailRows.map((row, index) => (
                  <ProfileListRow
                    key={row.key}
                    label={row.label}
                    value={row.value}
                    isFirst={index === 0}
                  />
                ))}
              </ProfileListSection>
            ) : null}
          </View>
        )}
      </ScrollView>

      {profile?.padel_category !== null && profile?.padel_category !== undefined ? (
        <PadelLevelSheet
          visible={levelSheetOpen}
          onClose={() => setLevelSheetOpen(false)}
          category={profile.padel_category}
        />
      ) : null}

      <ProfileStatsInfoSheet visible={statsInfoOpen} onClose={() => setStatsInfoOpen(false)} />
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
  body: {
    gap: L.sectionGap,
  },
  sectionTitle: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.faint,
    textTransform: 'uppercase',
    marginBottom: L.labelGap,
    paddingHorizontal: 4,
  },
  highlightsBlock: {},
  highlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aboutBlock: {},
  aboutText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 21,
    color: C.dim,
    paddingHorizontal: 4,
  },
});
