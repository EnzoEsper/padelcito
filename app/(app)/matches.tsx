import { useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, View, Text, Pressable } from "@/tw";
import { NotificationBell } from "@/components/notification-bell";
import { ReliabilityBadge } from "@/components/reliability-badge";
import {
  useMyMatches,
  useUpdateParticipantStatus,
  type HostRequest,
  type MatchSummary,
} from "@/features/matches/use-matches";
import { useMyMatchesRealtime } from "@/features/matches/use-match-realtime";
import { MatchSummaryCard } from "@/features/matches/components/match-summary-card";
import {
  MatchCalendarHeaderBadge,
  MatchCalendarMembershipLabel,
  resolveParticipantMembership,
} from "@/features/matches/components/match-status-badge";
import { buildRateMatchRoute } from "@/features/ratings/rating-display";
import { usePendingRatingCount } from "@/features/ratings/use-ratings";
import { SegmentedControl } from "@/features/matches/create-match/components/segmented-control";

type MatchesTab = "upcoming" | "history" | "pending";
type PendingView = "sent" | "inbox";

const C = {
  surface1: "#141417",
  blue: "#2B396D",
  mist: "#E4E4E4",
  faint: "rgba(228,228,228,0.38)",
  hair: "rgba(228,228,228,0.10)",
} as const;

function MyMatchCard({
  match,
  tab,
  onPress,
  needsRating,
  onRate,
}: {
  match: MatchSummary;
  tab: MatchesTab;
  onPress: () => void;
  needsRating?: boolean;
  onRate?: () => void;
}) {
  const membership = resolveParticipantMembership(match);

  return (
    <MatchSummaryCard
      match={match}
      onPress={onPress}
      muted={tab === "history"}
      headerBadge={<MatchCalendarHeaderBadge match={match} />}
      footerMembership={
        membership !== null ? (
          <MatchCalendarMembershipLabel match={match} />
        ) : undefined
      }
      rateAction={
        needsRating === true && onRate !== undefined
          ? { onPress: onRate }
          : undefined
      }
    />
  );
}

function PendingViewToggle({
  value,
  onChange,
}: {
  value: PendingView;
  onChange: (value: PendingView) => void;
}) {
  return (
    <View style={styles.viewToggle}>
      {(["sent", "inbox"] as const).map((mode) => {
        const active = value === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[
              styles.viewToggleItem,
              active && styles.viewToggleItemActive,
            ]}
          >
            <Ionicons
              name={mode === "sent" ? "send-outline" : "mail-outline"}
              size={18}
              color={active ? C.mist : C.faint}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function RequestCard({
  request,
  onAccept,
  onReject,
  isPending,
}: {
  request: HostRequest;
  onAccept: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  return (
    <View className="bg-surface-1 border border-neutral/10 rounded-2xl mx-5 mb-3 px-4 py-4 gap-3">
      <View>
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="font-grotesk font-bold text-base text-neutral">
            {request.requester?.display_name ?? "Player"}
          </Text>
          <ReliabilityBadge
            reliabilityScore={request.requester?.reliability_score ?? null}
            penaltyCount={request.requester?.penalty_count ?? 0}
            compact
          />
        </View>
        <Text className="font-grotesk text-sm text-neutral/60 mt-1">
          wants to join {request.match.title}
        </Text>
        {request.participant.message !== null ? (
          <Text className="font-grotesk text-sm text-neutral/70 mt-2 leading-5">
            {request.participant.message}
          </Text>
        ) : null}
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={onAccept}
          disabled={isPending}
          className="flex-1 h-11 rounded-xl bg-primary items-center justify-center"
        >
          <Text className="font-grotesk font-bold text-sm text-neutral">
            Accept
          </Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={isPending}
          className="flex-1 h-11 rounded-xl bg-surface-2 border border-neutral/10 items-center justify-center"
        >
          <Text className="font-grotesk font-bold text-sm text-warning">
            Reject
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View className="items-center mt-10 px-8">
      <Text className="font-grotesk font-bold text-lg text-neutral mb-2">
        {title}
      </Text>
      <Text className="font-grotesk text-sm text-neutral/60 text-center leading-5">
        {message}
      </Text>
    </View>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<MatchesTab>("upcoming");
  const [pendingView, setPendingView] = useState<PendingView>("sent");
  const { data, isPending, isRefetching, error, refetch } = useMyMatches();
  useMyMatchesRealtime(data?.userId ?? null);
  const { pendingMatchIds } = usePendingRatingCount();
  const updateStatus = useUpdateParticipantStatus("");

  async function handleStatus(
    participantId: string,
    status: "accepted" | "rejected",
  ) {
    try {
      await updateStatus.mutateAsync({ participantId, status });
    } catch (statusError) {
      const message =
        statusError instanceof Error
          ? statusError.message
          : "Could not update request.";
      Alert.alert("Update failed", message);
    }
  }

  function openMatch(matchId: string) {
    router.push(`/(app)/match-detail?id=${matchId}`);
  }

  function openRateMatch(matchId: string) {
    router.push(buildRateMatchRoute(matchId));
  }

  function renderTabContent() {
    if (data === undefined) return null;

    if (tab === "upcoming") {
      if (data.upcoming.length === 0) {
        return (
          <EmptyState
            title="No upcoming matches"
            message="Accepted matches and hosted games show up here."
          />
        );
      }
      return data.upcoming.map((match) => (
        <MyMatchCard
          key={match.id}
          match={match}
          tab="upcoming"
          onPress={() => openMatch(match.id)}
        />
      ));
    }

    if (tab === "history") {
      if (data.history.length === 0) {
        return (
          <EmptyState
            title="No match history"
            message="Past hosted and accepted matches will appear here."
          />
        );
      }
      return data.history.map((match) => (
        <MyMatchCard
          key={match.id}
          match={match}
          tab="history"
          onPress={() => openMatch(match.id)}
          needsRating={
            match.status === "finished" && pendingMatchIds.has(match.id)
          }
          onRate={() => openRateMatch(match.id)}
        />
      ));
    }

    if (pendingView === "sent") {
      if (data.pendingOutgoing.length === 0) {
        return (
          <EmptyState
            title="No pending requests"
            message="Matches you request to join will appear here while awaiting host approval."
          />
        );
      }
      return data.pendingOutgoing.map((match) => (
        <MyMatchCard
          key={match.id}
          match={match}
          tab="pending"
          onPress={() => openMatch(match.id)}
        />
      ));
    }

    if (data.hostRequests.length === 0) {
      return (
        <EmptyState
          title="No incoming requests"
          message="Join requests for your hosted matches will appear here."
        />
      );
    }

    return data.hostRequests.map((request) => (
      <RequestCard
        key={request.participant.id}
        request={request}
        isPending={updateStatus.isPending}
        onAccept={() => void handleStatus(request.participant.id, "accepted")}
        onReject={() => void handleStatus(request.participant.id, "rejected")}
      />
    ));
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-6"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={C.mist}
        />
      }
    >
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="px-5 pb-5 flex-row justify-between items-start"
      >
        <View>
          <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
            MATCHES
          </Text>
          <Text
            className="font-grotesk font-extrabold text-[30px] text-neutral"
            style={{ letterSpacing: -0.8 }}
          >
            Calendar
          </Text>
        </View>
        <NotificationBell />
      </View>

      <View className="mx-5 mb-4">
        <SegmentedControl
          options={[
            { value: "upcoming" as const, label: "Upcoming" },
            { value: "history" as const, label: "History" },
            { value: "pending" as const, label: "Pending" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === "pending" ? (
        <View className="mx-5 mb-4 flex-row items-center justify-between">
          <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60">
            {pendingView === "sent" ? "Sent requests" : "Host inbox"}
          </Text>
          <PendingViewToggle value={pendingView} onChange={setPendingView} />
        </View>
      ) : null}

      {isPending ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#E4E4E4" />
        </View>
      ) : error !== null ? (
        <View className="mx-5 bg-warning/10 border border-warning/30 rounded-xl p-4">
          <Text className="font-grotesk text-sm text-warning leading-5 mb-3">
            Could not load your matches.
          </Text>
          <Pressable onPress={() => void refetch()}>
            <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-warning">
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        renderTabContent()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  viewToggle: {
    flexDirection: "row",
    gap: 2,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 11,
    padding: 3,
  },
  viewToggleItem: {
    width: 38,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleItemActive: {
    backgroundColor: C.blue,
  },
});
