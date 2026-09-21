import { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppAlert } from "@/components/app-alert-dialog";
import { NotificationBell } from "@/components/notification-bell";
import { isLowReliability } from "@/features/ratings/penalty-report";
import { supabase } from "@/lib/supabase";
import {
  useProfile,
  useProfileSport,
  isModeratorRole,
  SKILL_LEVEL_LABEL,
  type SkillLevel,
} from "@/features/profile/use-profile";
import {
  PlayingProfileSection,
  ProfileAvatar,
  ProfileDemographicsLine,
  ProfileStatCard,
  RatingRing,
  ReliabilityStatBlock,
  SkillBadge,
} from "@/features/profile/profile-display";
import {
  computeAgeYearsFromBirthDate,
  formatDemographicsSummary,
} from "@/lib/profile-demographics";
import { usePlayingProfile } from "@/features/profile/use-playing-profile";
import { formatPlayingProfileSummary } from "@/lib/padel-position";
import {
  buildModerationRoute,
  buildMyPostsRoute,
} from "@/features/community/post-display";
import {
  buildModerationBannedUsersRoute,
  buildUserReportsRoute,
} from "@/features/safety/safety-display";
import { useModerationQueue } from "@/features/community/use-posts";
import { useBannedUsers } from "@/features/safety/use-banned-users";
import { useOpenUserReports } from "@/features/safety/use-user-reports";
import { useAppContentTopPadding } from "@/lib/app-layout-insets";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  background: "#0B0B0B",
  surface1: "#141417",
  surface3: "#232429",
  primaryHi: "#5E70B8",
  neutral: "#E4E4E4",
  dim: "rgba(228,228,228,0.60)",
  faint: "rgba(228,228,228,0.38)",
  ghost: "rgba(228,228,228,0.20)",
  hair: "rgba(228,228,228,0.10)",
  hair2: "rgba(228,228,228,0.055)",
  warning: "#E0B15B",
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <View className="px-5 pb-3">
      <Text style={styles.sectionLabel}>{children}</Text>
    </View>
  );
}

interface PreferenceRowProps {
  label: string;
  value?: string;
  isFirst?: boolean;
  onPress?: () => void;
  labelColor?: string;
  badgeCount?: number;
}

function PreferenceRow({
  label,
  value,
  isFirst = false,
  onPress,
  labelColor,
  badgeCount,
}: PreferenceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70"
      style={[styles.prefRow, !isFirst && styles.prefRowBorder]}
    >
      <Text
        style={[
          styles.prefLabel,
          labelColor ? { color: labelColor } : undefined,
        ]}
      >
        {label}
      </Text>
      <View style={styles.prefRight}>
        {value !== undefined && value.length > 0 && (
          <Text style={styles.prefValue}>{value}</Text>
        )}
        {badgeCount !== undefined && badgeCount > 0 ? (
          <View style={styles.prefBadge}>
            <Text style={styles.prefBadgeText}>
              {badgeCount > 99 ? "99+" : String(badgeCount)}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={C.faint} />
      </View>
    </Pressable>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <View className="gap-4 px-5 pt-4">
      <View style={styles.identityCard}>
        <View
          style={[
            styles.skeletonPill,
            { width: 64, height: 64, borderRadius: 32 },
          ]}
        />
        <View className="flex-1 gap-2">
          <View style={[styles.skeletonPill, { width: 140, height: 14 }]} />
          <View style={[styles.skeletonPill, { width: 100, height: 11 }]} />
          <View
            style={[
              styles.skeletonPill,
              { width: 88, height: 16, alignSelf: "flex-start" },
            ]}
          />
        </View>
        <View
          style={[
            styles.skeletonPill,
            { width: 92, height: 92, borderRadius: 46 },
          ]}
        />
      </View>
      <View className="flex-row gap-2.5">
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.statCard, { flex: 1 }]}>
            <View
              style={[
                styles.skeletonPill,
                { width: 40, height: 10, marginBottom: 8 },
              ]}
            />
            <View style={[styles.skeletonPill, { width: 30, height: 20 }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Sign-out ──────────────────────────────────────────────────────────────────

function useSignOut() {
  const appAlert = useAppAlert();

  return function confirmSignOut() {
    appAlert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          // Root layout's onAuthStateChange fires → session = null → redirect to login.
        },
      },
    ]);
  };
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const contentTopPadding = useAppContentTopPadding(16);
  const router = useRouter();
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
  const isRefetching =
    profileRefetching || sportRefetching || playingRefetching;
  const signOut = useSignOut();

  const isModerator = profile !== undefined && isModeratorRole(profile.role);
  const moderationQuery = useModerationQueue({ enabled: isModerator });
  const userReportsQuery = useOpenUserReports({ enabled: isModerator });
  const bannedUsersQuery = useBannedUsers({ enabled: isModerator });
  const pendingReviewCount = useMemo(
    () =>
      (moderationQuery.data ?? []).filter(
        (post) => post.status === "pending_review",
      ).length,
    [moderationQuery.data],
  );
  const openUserReportCount = userReportsQuery.data?.length ?? 0;
  const bannedUserCount = bannedUsersQuery.data?.length ?? 0;

  const skillLevel: SkillLevel = sport?.skill_level ?? "intermediate";
  const rating = profile?.rating_avg ?? 0;
  const ratingCount = profile?.rating_count ?? 0;
  const reliabilityScore = profile?.reliability_score ?? null;
  const penaltyCount = profile?.penalty_count ?? 0;
  const commitmentCount = profile?.commitment_count ?? 0;
  const playingProfileSummary = formatPlayingProfileSummary({
    dominantHand: playingProfile?.dominant_hand ?? null,
    courtSide: playingProfile?.court_side_preference ?? null,
    yearsPlaying: playingProfile?.years_playing ?? null,
  });
  const demographicsSummary = formatDemographicsSummary({
    gender: profile?.gender ?? null,
    ageYears: computeAgeYearsFromBirthDate(profile?.birth_date ?? null),
  });
  const showReliabilityWarning = isLowReliability(
    reliabilityScore,
    penaltyCount,
    commitmentCount,
  );
  const displayName = profile?.display_name ?? "Player";
  const username = profile?.username ?? "";
  const bio = profile?.bio;

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
            ])
          }
          tintColor={C.neutral}
        />
      }
    >
      {/* Header */}
      <View
        style={{ paddingTop: contentTopPadding }}
        className="px-5 pb-4 flex-row justify-between items-start"
      >
        <View>
          <Text style={styles.screenLabel}>PROFILE</Text>
          <Text style={styles.screenTitle}>You</Text>
        </View>
        <View style={styles.headerActions}>
          <NotificationBell />
          <Pressable
            className="active:opacity-70"
            style={styles.settingsBtn}
            accessibilityLabel="Account settings"
            onPress={() => router.push("/(app)/account-settings")}
          >
            <Ionicons name="settings-outline" size={19} color={C.neutral} />
          </Pressable>
        </View>
      </View>

      {profilePending ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Identity card */}
          <View
            style={[
              styles.identityCard,
              { marginHorizontal: 20, marginBottom: 16 },
            ]}
          >
            <ProfileAvatar
              name={displayName}
              avatarUrl={profile?.avatar_url}
              size={64}
            />
            <View style={styles.identityMeta}>
              <Text style={styles.identityName} numberOfLines={1}>
                {displayName}
              </Text>
              {username.length > 0 && (
                <Text style={styles.username} numberOfLines={1}>
                  @{username}
                </Text>
              )}
              <SkillBadge skillLevel={skillLevel} />
              {profile !== undefined ? (
                <ProfileDemographicsLine
                  gender={profile.gender}
                  ageYears={computeAgeYearsFromBirthDate(profile.birth_date)}
                />
              ) : null}
            </View>
            <View style={styles.trustRing}>
              <RatingRing value={rating} />
            </View>
          </View>

          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <PlayingProfileSection
              parts={{
                dominantHand: playingProfile?.dominant_hand ?? null,
                courtSide: playingProfile?.court_side_preference ?? null,
                yearsPlaying: playingProfile?.years_playing ?? null,
              }}
            />
          </View>

          {showReliabilityWarning ? (
            <View style={styles.penaltyNotice}>
              <Ionicons name="warning-outline" size={16} color={C.warning} />
              <Text style={styles.penaltyNoticeText}>
                {penaltyCount > 0
                  ? `You have ${penaltyCount} reliability report${penaltyCount === 1 ? "" : "s"}. Play fair to rebuild trust.`
                  : "Your reliability score is below the community average. Keep showing up on time."}
              </Text>
            </View>
          ) : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <ProfileStatCard label="REVIEWS" value={String(ratingCount)} />
            <ProfileStatCard
              label="RATING"
              value={rating > 0 ? rating.toFixed(1) : "—"}
            />
            <ReliabilityStatBlock
              reliabilityScore={reliabilityScore}
              penaltyCount={penaltyCount}
              commitmentCount={commitmentCount}
            />
          </View>

          {/* Community */}
          <SectionLabel>COMMUNITY</SectionLabel>
          <View
            style={[
              styles.prefCard,
              { marginHorizontal: 20, marginBottom: 16 },
            ]}
          >
            <PreferenceRow
              label="My publications"
              isFirst
              onPress={() => router.push(buildMyPostsRoute())}
            />
            {isModerator ? (
              <PreferenceRow
                label="Moderation queue"
                badgeCount={pendingReviewCount}
                onPress={() => router.push(buildModerationRoute())}
              />
            ) : null}
            {isModerator ? (
              <PreferenceRow
                label="User reports"
                badgeCount={openUserReportCount}
                onPress={() => router.push(buildUserReportsRoute())}
              />
            ) : null}
            {isModerator ? (
              <PreferenceRow
                label="Banned users"
                badgeCount={bannedUserCount}
                onPress={() => router.push(buildModerationBannedUsersRoute())}
              />
            ) : null}
          </View>

          {/* Preferences */}
          <SectionLabel>PREFERENCES</SectionLabel>
          <View
            style={[
              styles.prefCard,
              { marginHorizontal: 20, marginBottom: 16 },
            ]}
          >
            <PreferenceRow label="Bio" value={bio ?? undefined} isFirst />
            <PreferenceRow
              label="Skill Level"
              value={SKILL_LEVEL_LABEL[skillLevel]}
            />
            <PreferenceRow
              label="Playing profile"
              value={playingProfileSummary ?? "Not set yet"}
              onPress={() => router.push("/(app)/edit-playing-profile")}
            />
            <PreferenceRow
              label="Personal info"
              value={demographicsSummary ?? "Add age & gender"}
              onPress={() => router.push("/(app)/edit-personal-info")}
            />
            <PreferenceRow label="Location" value="Set location" />
          </View>

          {/* Account */}
          <SectionLabel>ACCOUNT</SectionLabel>
          <View style={[styles.prefCard, { marginHorizontal: 20 }]}>
            <PreferenceRow
              label="Account settings"
              isFirst
              onPress={() => router.push("/(app)/account-settings")}
            />
            <PreferenceRow
              label="Sign Out"
              onPress={signOut}
              labelColor={C.warning}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenLabel: {
    fontFamily: "Space Mono",
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: "HankenGrotesk-ExtraBold",
    fontSize: 30,
    color: C.neutral,
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: "HankenGrotesk-Bold",
    letterSpacing: 0.3,
  },
  skillBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skillBadgeText: {
    fontFamily: "SpaceMono-Bold",
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  identityMeta: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 5,
  },
  identityName: {
    fontFamily: "HankenGrotesk-Bold",
    fontSize: 19,
    color: C.neutral,
  },
  username: {
    fontFamily: "Space Mono",
    fontSize: 11,
    color: C.dim,
    letterSpacing: 0.5,
  },
  trustRing: {
    flexShrink: 0,
  },
  ringCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    fontFamily: "SpaceMono-Bold",
    fontSize: 22,
    color: C.neutral,
    lineHeight: 26,
  },
  ringLabel: {
    fontFamily: "Space Mono",
    fontSize: 8.5,
    color: C.dim,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 3,
  },
  penaltyNotice: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(224,177,91,0.08)",
    borderWidth: 1,
    borderColor: "rgba(224,177,91,0.30)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  penaltyNoticeText: {
    flex: 1,
    fontFamily: "Hanken Grotesk",
    fontSize: 13,
    lineHeight: 18,
    color: C.warning,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    padding: 14,
    paddingTop: 15,
  },
  statLabel: {
    fontFamily: "Space Mono",
    fontSize: 9.5,
    color: C.dim,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  statValue: {
    fontFamily: "HankenGrotesk-ExtraBold",
    fontSize: 22,
    color: C.neutral,
    letterSpacing: -0.5,
  },
  statSub: {
    fontFamily: "Space Mono",
    fontSize: 12,
    color: C.dim,
  },
  sectionLabel: {
    fontFamily: "SpaceMono-Bold",
    fontSize: 11.5,
    color: C.dim,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  prefCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  prefRowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.hair2,
  },
  prefLabel: {
    fontFamily: "HankenGrotesk-Medium",
    fontSize: 15,
    color: C.neutral,
  },
  prefRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  prefValue: {
    fontFamily: "HankenGrotesk-Medium",
    fontSize: 14,
    color: C.dim,
  },
  prefBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.warning,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  prefBadgeText: {
    fontFamily: "SpaceMono-Bold",
    fontSize: 10,
    color: "#0B0B0B",
  },
  skeletonPill: {
    backgroundColor: C.surface3,
    borderRadius: 4,
  },
});
