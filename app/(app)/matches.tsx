import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, View, Text, Pressable } from "@/tw";
import { formatMatchListDateTime } from "@/lib/match-time";
import {
  useMyMatches,
  useUpdateParticipantStatus,
  type HostRequest,
  type MatchSummary,
} from "@/features/matches/use-matches";
import { useMyMatchesRealtime } from "@/features/matches/use-match-realtime";
import { SegmentedControl } from "@/features/matches/create-match/components/segmented-control";
import {
  categoryToBadgeTier,
  type SkillBadgeTier,
} from "@/features/matches/match-display";
import { SKILL_LABEL } from "@/features/profile/use-profile";

type MatchesTab = "upcoming" | "history" | "pending";
type PendingView = "sent" | "inbox";
type PillVariant = "confirmed" | "pending" | "completed" | "host" | "cancelled";

const C = {
  surface1: "#141417",
  blue: "#2B396D",
  mist: "#E4E4E4",
  faint: "rgba(228,228,228,0.38)",
  hair: "rgba(228,228,228,0.10)",
} as const;

const SKILL_BADGE_CLASS: Record<
  SkillBadgeTier,
  { container: string; text: string }
> = {
  A: { container: "bg-primary", text: "text-neutral" },
  B: { container: "bg-primary/20", text: "text-primary-hi" },
  C: { container: "bg-surface-3", text: "text-neutral/60" },
  D: { container: "bg-surface-3", text: "text-neutral/38" },
};

const PILL_CLASS: Record<PillVariant, { container: string; text: string }> = {
  confirmed: {
    container: "bg-[rgba(91,224,166,0.1)] border-[rgba(91,224,166,0.3)]",
    text: "text-[#5BE0A6]",
  },
  pending: {
    container: "bg-warning/10 border-warning/30",
    text: "text-warning",
  },
  completed: {
    container: "bg-surface-3 border-neutral/10",
    text: "text-neutral/60",
  },
  host: {
    container: "bg-primary/20 border-primary-hi/30",
    text: "text-primary-hi",
  },
  cancelled: {
    container: "bg-neutral/10 border-neutral/20",
    text: "text-neutral/60",
  },
};

function resolvePillVariant(match: MatchSummary, tab: MatchesTab): PillVariant {
  if (match.status === "cancelled") return "cancelled";
  if (tab === "history") return "completed";
  if (match.currentUserParticipant?.status === "pending") return "pending";
  if (match.isHostedByCurrentUser) return "host";
  return "confirmed";
}

function resolvePillLabel(variant: PillVariant): string {
  switch (variant) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
    case "host":
      return "Host";
    case "cancelled":
      return "Cancelled";
    default:
      return "Confirmed";
  }
}

function StatePill({ variant }: { variant: PillVariant }) {
  const styles = PILL_CLASS[variant];
  return (
    <View
      className={[
        "rounded-lg border px-2.5 py-1 flex-row items-center gap-1.5",
        styles.container,
      ].join(" ")}
    >
      {variant === "pending" ? (
        <View className="w-[5px] h-[5px] rounded-full bg-warning" />
      ) : null}
      <Text
        className={[
          "font-mono text-[9.5px] tracking-[0.11em] uppercase font-bold",
          styles.text,
        ].join(" ")}
      >
        {resolvePillLabel(variant)}
      </Text>
    </View>
  );
}

function SkillBadge({ level }: { level: SkillBadgeTier }) {
  const styles = SKILL_BADGE_CLASS[level];
  return (
    <View className={["rounded-lg px-2 py-1", styles.container].join(" ")}>
      <Text
        className={[
          "font-mono text-[9.5px] tracking-[0.08em] font-bold",
          styles.text,
        ].join(" ")}
      >
        {SKILL_LABEL[level]}
      </Text>
    </View>
  );
}

function FillMeter({ filled, total }: { filled: number; total: number }) {
  const slots = Math.min(total, 4);
  return (
    <View className="flex-row items-center gap-1">
      {Array.from({ length: slots }).map((_, index) => (
        <View
          key={index}
          className={[
            "w-[7px] h-[7px] rounded-full",
            index < filled ? "bg-primary-hi" : "bg-neutral/20",
          ].join(" ")}
        />
      ))}
    </View>
  );
}

function MatchRow({
  match,
  tab,
  onPress,
  subtitle,
}: {
  match: MatchSummary;
  tab: MatchesTab;
  onPress: () => void;
  subtitle?: string;
}) {
  const variant = resolvePillVariant(match, tab);
  const level = categoryToBadgeTier(match.category_max);
  const muted = tab === "history";

  return (
    <Pressable
      onPress={onPress}
      className={[
        "bg-surface-1 border border-neutral/10 rounded-[18px] mx-5 mb-3 px-4 py-4 active:opacity-80",
        muted ? "opacity-90" : "",
      ].join(" ")}
    >
      <View className="flex-row items-center justify-between mb-3">
        <StatePill variant={variant} />
        <SkillBadge level={level} />
      </View>

      <Text
        className="font-grotesk font-bold text-base text-neutral mb-1.5"
        style={{ letterSpacing: -0.2 }}
      >
        {match.venue_name ?? match.title}
      </Text>

      <Text className="font-grotesk text-[13.5px] text-neutral/60 mb-1">
        {formatMatchListDateTime(match.starts_at)}
      </Text>

      {subtitle !== undefined ? (
        <Text className="font-grotesk text-sm text-warning/90 mb-2">
          {subtitle}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center gap-2">
          <FillMeter filled={match.totalFilled} total={match.capacity} />
          <Text className="font-mono text-[10px] tracking-[0.12em] uppercase text-neutral/38">
            {match.totalFilled}/{match.capacity}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color="rgba(228,228,228,0.20)"
        />
      </View>
    </Pressable>
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
        <Text className="font-grotesk font-bold text-base text-neutral">
          {request.requester?.display_name ?? "Player"}
        </Text>
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
  const { data, isPending, error, refetch } = useMyMatches();
  useMyMatchesRealtime(data?.userId ?? null);
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
        <MatchRow
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
        <MatchRow
          key={match.id}
          match={match}
          tab="history"
          onPress={() => openMatch(match.id)}
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
        <MatchRow
          key={match.id}
          match={match}
          tab="pending"
          subtitle="Awaiting host approval"
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
    >
      <View style={{ paddingTop: insets.top + 16 }} className="px-5 pb-5">
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
