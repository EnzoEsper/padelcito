import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from '@/tw';
import { StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppAlert } from '@/components/app-alert-dialog';
import { NotificationBell } from '@/components/notification-bell';
import {
  formatReliabilityScore,
  isLowReliability,
} from '@/features/ratings/penalty-report';
import { supabase } from '@/lib/supabase';
import {
  useProfile,
  useProfileSport,
  isModeratorRole,
} from '@/features/profile/use-profile';
import { clampPadelCategory } from '@/lib/padel-category';
import {
  buildPlayingRows,
  ProfileIdentityCard,
  ProfileListRow,
  ProfileListSection,
  ProfileMetricStrip,
  ProfileWhatsAppVerifiedBadge,
  formatReliabilityStripCaption,
  PROFILE_COLORS as C,
  PROFILE_LAYOUT as L,
} from '@/features/profile/profile-display';
import { PadelLevelSheet } from '@/features/profile/padel-level-sheet';
import { shareOwnProfile } from '@/features/profile/share-profile';
import { ProfileStatsInfoSheet } from '@/features/profile/profile-stats-info-sheet';
import {
  computeAgeYearsFromBirthDate,
  formatProfileAgeLabel,
  formatProfileGenderLabel,
  formatProfileJoinedLabel,
} from '@/lib/profile-demographics';
import { usePlayingProfile } from '@/features/profile/use-playing-profile';
import { usePublicProfileStats } from '@/features/profile/use-public-profile-stats';
import {
  buildModerationRoute,
  buildMyPostsRoute,
} from '@/features/community/post-display';
import {
  buildModerationBannedUsersRoute,
  buildUserReportsRoute,
} from '@/features/safety/safety-display';
import { useModerationQueue } from '@/features/community/use-posts';
import { useBannedUsers } from '@/features/safety/use-banned-users';
import { useOpenUserReports } from '@/features/safety/use-user-reports';
import { useAppContentTopPadding } from '@/lib/app-layout-insets';
import { PROFILE_HOME_HREF, pushFromProfileTab } from '@/lib/app-navigation';
import { usePhoneVerification } from '@/features/profile/phone-verification-provider';

interface PreferenceRowProps {
  label: string;
  isFirst?: boolean;
  onPress?: () => void;
  badgeCount?: number;
}

function PreferenceRow({
  label,
  isFirst = false,
  onPress,
  badgeCount,
}: PreferenceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70"
      style={[styles.prefRow, !isFirst && styles.prefRowBorder]}
    >
      <Text style={styles.prefLabel}>{label}</Text>
      <View style={styles.prefRight}>
        {badgeCount !== undefined && badgeCount > 0 ? (
          <View style={styles.prefBadge}>
            <Text style={styles.prefBadgeText}>
              {badgeCount > 99 ? '99+' : String(badgeCount)}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={C.faint} />
      </View>
    </Pressable>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={[styles.skeletonPill, { height: 100, borderRadius: L.identityCardRadius }]} />
      <View style={[styles.skeletonPill, { height: 72, borderRadius: L.groupRadius }]} />
      <View style={[styles.skeletonPill, { height: 120, borderRadius: L.groupRadius }]} />
    </View>
  );
}

function useSignOut() {
  const appAlert = useAppAlert();

  return function confirmSignOut() {
    appAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };
}

export default function ProfileScreen() {
  const contentTopPadding = useAppContentTopPadding(16);
  const router = useRouter();
  const [statsInfoOpen, setStatsInfoOpen] = useState(false);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);

  const {
    data: profile,
    isPending: profilePending,
    isRefetching: profileRefetching,
    refetch: refetchProfile,
  } = useProfile();
  const {
    data: sport,
    isRefetching: sportRefetching,
    refetch: refetchSport,
  } = useProfileSport();
  const {
    data: playingProfile,
    isRefetching: playingRefetching,
    refetch: refetchPlayingProfile,
  } = usePlayingProfile();

  const profileId = profile?.id ?? null;
  const {
    data: publicStats,
    isRefetching: statsRefetching,
    refetch: refetchPublicStats,
  } = usePublicProfileStats(profileId, { enabled: profileId !== null });

  const isRefetching =
    profileRefetching || sportRefetching || playingRefetching || statsRefetching;
  const signOut = useSignOut();
  const { openVerifySheet } = usePhoneVerification();
  const isWhatsAppVerified = profile?.whatsapp_verified_at !== null;
  const hasWhatsAppNumber =
    profile?.whatsapp_phone !== null &&
    profile?.whatsapp_phone !== undefined &&
    profile.whatsapp_phone.length > 0;

  const isModerator = profile !== undefined && isModeratorRole(profile.role);
  const moderationQuery = useModerationQueue({ enabled: isModerator });
  const userReportsQuery = useOpenUserReports({ enabled: isModerator });
  const bannedUsersQuery = useBannedUsers({ enabled: isModerator });
  const pendingReviewCount = useMemo(
    () =>
      (moderationQuery.data ?? []).filter((post) => post.status === 'pending_review').length,
    [moderationQuery.data],
  );
  const openUserReportCount = userReportsQuery.data?.length ?? 0;
  const bannedUserCount = bannedUsersQuery.data?.length ?? 0;

  const padelCategory = clampPadelCategory(sport?.padel_category ?? 5);
  const rating = profile?.rating_avg ?? 0;
  const ratingCount = profile?.rating_count ?? 0;
  const reliabilityScore = profile?.reliability_score ?? null;
  const penaltyCount = profile?.penalty_count ?? 0;
  const commitmentCount = profile?.commitment_count ?? 0;
  const reliabilityLow = isLowReliability(reliabilityScore, penaltyCount, commitmentCount);
  const displayName = profile?.display_name ?? 'Player';
  const username = profile?.username ?? '';

  const openEditProfile = () => {
    pushFromProfileTab(router, '/(app)/edit-profile');
  };

  const shareProfile = () => {
    const userId = profile?.id;
    if (userId === undefined) {
      return;
    }
    void shareOwnProfile({
      userId,
      displayName,
      username: username.length > 0 ? username : null,
    }).catch(() => {
      /* dismissed or failed — no modal */
    });
  };

  const playingRows = buildPlayingRows({
    dominantHand: playingProfile?.dominant_hand ?? null,
    courtSide: playingProfile?.court_side_preference ?? null,
    yearsPlaying: playingProfile?.years_playing ?? null,
  });

  const ageYears =
    profile !== undefined ? computeAgeYearsFromBirthDate(profile.birth_date) : null;
  const ageLabel = formatProfileAgeLabel(ageYears);
  const genderLabel =
    profile !== undefined ? formatProfileGenderLabel(profile.gender) : null;
  const joinedLabel =
    profile !== undefined ? formatProfileJoinedLabel(profile.created_at) : null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-8"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() =>
            void Promise.all([
              refetchProfile(),
              refetchSport(),
              refetchPlayingProfile(),
              refetchPublicStats(),
            ])
          }
          tintColor={C.neutral}
        />
      }
    >
      <View
        style={{ paddingTop: contentTopPadding }}
        className="px-5 pb-4 flex-row justify-between items-start"
      >
        <View>
          <Text style={styles.screenLabel}>PROFILE</Text>
          <Text style={styles.screenTitle}>You</Text>
        </View>
        <View style={styles.headerActions}>
          <NotificationBell returnHref={PROFILE_HOME_HREF} />
          <Pressable
            className="active:opacity-70"
            style={styles.settingsBtn}
            accessibilityLabel="Account settings"
            onPress={() => pushFromProfileTab(router, '/(app)/account-settings')}
          >
            <Ionicons name="settings-outline" size={19} color={C.neutral} />
          </Pressable>
        </View>
      </View>

      {profilePending ? (
        <ProfileSkeleton />
      ) : (
        <View style={styles.body}>
          <ProfileIdentityCard
            name={displayName}
            username={username.length > 0 ? username : null}
            avatarUrl={profile?.avatar_url}
            nameTrailing={isWhatsAppVerified ? <ProfileWhatsAppVerifiedBadge /> : null}
            rating={rating}
            reviewCount={ratingCount}
          />

          {!isWhatsAppVerified ? (
            <Pressable
              onPress={openVerifySheet}
              className="active:opacity-85"
              style={styles.verifyCard}
              accessibilityRole="button"
              accessibilityLabel="Verify WhatsApp"
            >
              <View style={styles.verifyCardCopy}>
                <Text style={styles.verifyCardTitle}>
                  {hasWhatsAppNumber
                    ? 'Verify your WhatsApp to play and publish'
                    : 'Add and verify WhatsApp to play and publish'}
                </Text>
                <Text style={styles.verifyCardSubtitle}>
                  Required to create matches, join, and post in Community.
                </Text>
              </View>
              <View style={styles.verifyCardButton}>
                <Text style={styles.verifyCardButtonText}>Verify</Text>
              </View>
            </Pressable>
          ) : null}

          <ProfileMetricStrip
            containerStyle={styles.strip}
            data={{
              category: padelCategory,
              reliabilityValue: formatReliabilityScore(reliabilityScore, commitmentCount),
              reliabilityCaption: formatReliabilityStripCaption(commitmentCount),
              reliabilityLow,
              matchesPlayed: publicStats?.matchesFinishedCount ?? 0,
            }}
            onLevelPress={() => setLevelSheetOpen(true)}
            onStatsHelpPress={() => setStatsInfoOpen(true)}
          />

          {reliabilityLow ? (
            <Text style={styles.compactWarning} numberOfLines={2}>
              Reliability is below community average — show up on time to rebuild trust.
            </Text>
          ) : null}

          <View style={styles.profileActions}>
            <Pressable
              onPress={openEditProfile}
              className="active:opacity-85"
              style={styles.profileActionButton}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Text style={styles.profileActionButtonText}>Edit profile</Text>
            </Pressable>
            <Pressable
              onPress={shareProfile}
              className="active:opacity-85"
              style={styles.profileActionButton}
              accessibilityRole="button"
              accessibilityLabel="Share profile"
              disabled={profile?.id === undefined}
            >
              <Text style={styles.profileActionButtonText}>Share profile</Text>
            </Pressable>
          </View>

          <ProfileListSection title="ACTIVITY">
            <ProfileListRow
              label="My publications"
              value=""
              isFirst
              onPress={() => pushFromProfileTab(router, buildMyPostsRoute())}
            />
          </ProfileListSection>

          <ProfileListSection title="PLAYING STYLE">
            {playingRows.map((row, index) => (
              <ProfileListRow
                key={row.label}
                label={row.label}
                value={row.missing ? 'Add' : row.value}
                isFirst={index === 0}
                placeholder={row.missing}
                onPress={openEditProfile}
              />
            ))}
          </ProfileListSection>

          <ProfileListSection title="DETAILS">
            <ProfileListRow
              label="Age"
              value={ageLabel ?? 'Not set'}
              isFirst
              placeholder={ageLabel === null}
              onPress={openEditProfile}
            />
            <ProfileListRow
              label="Gender"
              value={genderLabel ?? 'Not set'}
              placeholder={genderLabel === null}
              onPress={openEditProfile}
            />
            <ProfileListRow
              label="Joined"
              value={joinedLabel ?? '—'}
              onPress={undefined}
            />
          </ProfileListSection>

          {isModerator ? (
            <ProfileListSection title="MODERATION">
              <PreferenceRow
                label="Moderation queue"
                isFirst
                badgeCount={pendingReviewCount}
                onPress={() => pushFromProfileTab(router, buildModerationRoute())}
              />
              <PreferenceRow
                label="User reports"
                badgeCount={openUserReportCount}
                onPress={() => pushFromProfileTab(router, buildUserReportsRoute())}
              />
              <PreferenceRow
                label="Banned users"
                badgeCount={bannedUserCount}
                onPress={() => pushFromProfileTab(router, buildModerationBannedUsersRoute())}
              />
            </ProfileListSection>
          ) : null}

          <Pressable
            onPress={signOut}
            className="active:opacity-70"
            style={styles.signOutRow}
            accessibilityRole="button"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      )}

      <PadelLevelSheet
        visible={levelSheetOpen}
        onClose={() => setLevelSheetOpen(false)}
        category={padelCategory}
        onChangeLevel={openEditProfile}
      />
      <ProfileStatsInfoSheet visible={statsInfoOpen} onClose={() => setStatsInfoOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 30,
    color: C.neutral,
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: L.horizontalPadding,
    gap: L.sectionGap,
  },
  strip: {
    marginTop: L.cardToStripGap - L.sectionGap,
  },
  compactWarning: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    lineHeight: 17,
    color: C.warning,
    marginTop: -12,
  },
  verifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: L.groupRadius,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
  },
  verifyCardCopy: {
    flex: 1,
    gap: 4,
  },
  verifyCardTitle: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
    color: C.neutral,
    lineHeight: 19,
  },
  verifyCardSubtitle: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    color: C.dim,
    lineHeight: 16,
  },
  verifyCardButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2B396D',
    borderWidth: 1,
    borderColor: C.primaryHi,
  },
  verifyCardButtonText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
    color: C.neutral,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -8,
  },
  profileActionButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileActionButtonText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: C.neutral,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  prefRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hair2,
  },
  prefLabel: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: C.neutral,
  },
  prefRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  prefBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.warning,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  prefBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    color: '#0B0B0B',
  },
  signOutRow: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: C.warning,
  },
  skeletonWrap: {
    paddingHorizontal: L.horizontalPadding,
    gap: 16,
  },
  skeletonPill: {
    backgroundColor: C.surface3,
    borderRadius: 4,
  },
});
