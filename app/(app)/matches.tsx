import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FlashList, View, Text, Pressable } from "@/tw";
import { useAppAlert } from "@/components/app-alert-dialog";
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

type MatchesListItem =
  | { kind: "match"; match: MatchSummary; tab: MatchesTab }
  | { kind: "request"; request: HostRequest };

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

function emptyStateForTab(tab: MatchesTab, pendingView: PendingView): {
  title: string;
  message: string;
} {
  if (tab === "upcoming") {
    return {
      title: "No upcoming matches",
      message: "Accepted matches and hosted games show up here.",
    };
  }
  if (tab === "history") {
    return {
      title: "No match history",
      message: "Past hosted and accepted matches will appear here.",
    };
  }
  if (pendingView === "sent") {
    return {
      title: "No pending requests",
      message:
        "Matches you request to join will appear here while awaiting host approval.",
    };
  }
  return {
    title: "No incoming requests",
    message: "Join requests for your hosted matches will appear here.",
  };
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appAlert = useAppAlert();
  const [tab, setTab] = useState<MatchesTab>("upcoming");
  const [pendingView, setPendingView] = useState<PendingView>("sent");
  const { data, isPending, isRefetching, error, refetch } = useMyMatches();
  useMyMatchesRealtime(data?.userId ?? null);
  const { pendingMatchIds } = usePendingRatingCount();
  const updateStatus = useUpdateParticipantStatus("");

  const openMatch = useCallback(
    (matchId: string) => {
      router.push(`/(app)/match-detail?id=${matchId}`);
    },
    [router],
  );

  const openRateMatch = useCallback(
    (matchId: string) => {
      router.push(buildRateMatchRoute(matchId));
    },
    [router],
  );

  const handleStatus = useCallback(
    async (participantId: string, status: "accepted" | "rejected") => {
      try {
        await updateStatus.mutateAsync({ participantId, status });
      } catch (statusError) {
        const message =
          statusError instanceof Error
            ? statusError.message
            : "Could not update request.";
        appAlert("Update failed", message);
      }
    },
    [appAlert, updateStatus],
  );

  const listData = useMemo((): MatchesListItem[] => {
    if (data === undefined) return [];

    if (tab === "upcoming") {
      return data.upcoming.map((match) => ({ kind: "match", match, tab: "upcoming" }));
    }
    if (tab === "history") {
      return data.history.map((match) => ({ kind: "match", match, tab: "history" }));
    }
    if (pendingView === "sent") {
      return data.pendingOutgoing.map((match) => ({
        kind: "match",
        match,
        tab: "pending",
      }));
    }
    return data.hostRequests.map((request) => ({ kind: "request", request }));
  }, [data, tab, pendingView]);

  const listKey = `${tab}-${pendingView}`;

  const renderItem = useCallback(
    ({ item }: { item: MatchesListItem }) => {
      if (item.kind === "request") {
        return (
          <RequestCard
            request={item.request}
            isPending={updateStatus.isPending}
            onAccept={() =>
              void handleStatus(item.request.participant.id, "accepted")
            }
            onReject={() =>
              void handleStatus(item.request.participant.id, "rejected")
            }
          />
        );
      }

      return (
        <MyMatchCard
          match={item.match}
          tab={item.tab}
          onPress={() => openMatch(item.match.id)}
          needsRating={
            item.tab === "history" &&
            item.match.status === "finished" &&
            pendingMatchIds.has(item.match.id)
          }
          onRate={
            item.tab === "history" ? () => openRateMatch(item.match.id) : undefined
          }
        />
      );
    },
    [
      handleStatus,
      openMatch,
      openRateMatch,
      pendingMatchIds,
      updateStatus.isPending,
    ],
  );

  const keyExtractor = useCallback((item: MatchesListItem) => {
    if (item.kind === "request") return `request-${item.request.participant.id}`;
    return item.match.id;
  }, []);

  const listHeader = useMemo(
    () => (
      <>
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
      </>
    ),
    [insets.top, pendingView, tab],
  );

  const listEmpty = useMemo(() => {
    if (isPending) {
      return (
        <View className="items-center py-10">
          <ActivityIndicator color="#E4E4E4" />
        </View>
      );
    }
    if (error !== null) {
      return (
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
      );
    }
    const empty = emptyStateForTab(tab, pendingView);
    return <EmptyState title={empty.title} message={empty.message} />;
  }, [error, isPending, pendingView, refetch, tab]);

  return (
    <View className="flex-1 bg-background">
      {listHeader}
      <FlashList
        key={listKey}
        style={styles.feedList}
        contentContainerStyle={{ paddingBottom: 24 }}
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={C.mist}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feedList: {
    flex: 1,
  },
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
