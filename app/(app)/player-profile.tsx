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
  formatMemberSince,
  PlayingProfileSection,
  ProfileAvatar,
  ProfileDemographicsLine,
  ProfileStatCard,
  PROFILE_COLORS as C,
  QualityHighlightChip,
  RatingRing,
  ReliabilityStatBlock,
  SkillBadge,
} from '@/features/profile/profile-display';
import { ProfileStatsInfoSheet } from '@/features/profile/profile-stats-info-sheet';
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

  const footerMeta = useMemo(() => {
    const parts: string[] = [];
    const memberSince = formatMemberSince(profile?.created_at ?? null);
    if (memberSince !== null) {
      parts.push(memberSince);
    }

    const finishedCount = publicStatsQuery.data?.matchesFinishedCount ?? 0;
    if (finishedCount > 0) {
      parts.push(
        `${finishedCount} match${finishedCount === 1 ? '' : 'es'} played`,
      );
    }

    const mutualCount = publicStatsQuery.data?.mutualFinishedCount ?? 0;
    if (mutualCount > 0 && !isSelf) {
      parts.push(`Played together ${mutualCount} time${mutualCount === 1 ? '' : 's'}`);
    }

    return parts.join(' · ');
  }, [profile?.created_at, publicStatsQuery.data, isSelf]);

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
          paddingTop: headerTop,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: SCREEN_PADDING,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerMetaRow}>
          <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
            PLAYER PROFILE
          </Text>
        </View>

        {postId !== null && matchId === null ? (
          <View style={styles.contextChip}>
            <Ionicons name="megaphone-outline" size={14} color={C.primaryHi} />
            <Text style={styles.contextChipText}>Post organizer</Text>
          </View>
        ) : null}

        {publicProfileQuery.isPending ? (
          <ActivityIndicator color={C.neutral} style={styles.loader} />
        ) : profile === undefined || profile === null ? (
          <Text style={styles.emptyText}>This player profile is not available.</Text>
        ) : (
          <>
            <View style={styles.identityCard}>
              <ProfileAvatar
                name={profile.display_name}
                avatarUrl={profile.avatar_url}
                size={72}
              />
              <View style={styles.identityMeta}>
                <Text style={styles.identityName} numberOfLines={2}>
                  {profile.display_name}
                </Text>
                {profile.username !== null && profile.username.length > 0 ? (
                  <Text style={styles.username} numberOfLines={1}>
                    @{profile.username}
                  </Text>
                ) : null}
                {profile.skill_level !== null ? (
                  <SkillBadge skillLevel={profile.skill_level} />
                ) : null}
                <ProfileDemographicsLine
                  gender={profile.gender}
                  ageYears={profile.age_years}
                />
              </View>
              <View style={styles.ratingRing}>
                <RatingRing value={profile.rating_avg ?? 0} />
              </View>
            </View>

            <PlayingProfileSection
              parts={{
                dominantHand: profile.dominant_hand,
                courtSide: profile.court_side_preference,
                yearsPlaying: profile.years_playing,
              }}
            />

            <View style={styles.statsHeaderRow}>
              <Text style={styles.sectionLabel}>TRUST</Text>
              <Pressable
                onPress={() => setStatsInfoOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Learn about profile stats"
              >
                <Ionicons name="help-circle-outline" size={18} color={C.faint} />
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <ProfileStatCard label="REVIEWS" value={String(profile.rating_count)} />
              <ProfileStatCard
                label="RATING"
                value={
                  (profile.rating_avg ?? 0) > 0
                    ? (profile.rating_avg ?? 0).toFixed(1)
                    : '—'
                }
              />
              <ReliabilityStatBlock
                reliabilityScore={profile.reliability_score}
                penaltyCount={profile.penalty_count}
                commitmentCount={profile.commitment_count}
              />
            </View>

            {highlightTags.length > 0 ? (
              <View style={styles.highlightsSection}>
                <Text style={styles.sectionLabel}>HIGHLIGHTS</Text>
                <View style={styles.highlightRow}>
                  {highlightTags.map((tag) => (
                    <QualityHighlightChip key={tag} label={tag} />
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>ABOUT</Text>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>
                {profile.bio !== null && profile.bio.trim().length > 0
                  ? profile.bio
                  : 'No bio yet.'}
              </Text>
            </View>

            {footerMeta.length > 0 ? (
              <Text style={styles.memberSince}>{footerMeta}</Text>
            ) : null}
          </>
        )}
      </ScrollView>

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
  headerMetaRow: {
    height: BACK_BUTTON_SIZE,
    justifyContent: 'center',
    paddingLeft: BACK_BUTTON_SIZE + 12,
    marginBottom: 4,
  },
  contextChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(94,112,184,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(94,112,184,0.25)',
  },
  contextChipText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    fontWeight: '600',
    color: C.primaryHi,
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
  identityCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 16,
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
    color: C.neutral,
  },
  username: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    color: C.dim,
    letterSpacing: 0.5,
  },
  ratingRing: {
    flexShrink: 0,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.faint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  highlightsSection: {
    marginBottom: 20,
  },
  highlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aboutCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  aboutText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 21,
    color: C.dim,
  },
  memberSince: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    color: C.faint,
    textAlign: 'center',
  },
});
