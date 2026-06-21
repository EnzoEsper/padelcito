import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable } from '@/tw';
import { formatMatchListDateTime } from '@/lib/match-time';
import {
  useMyMatches,
  useUpdateParticipantStatus,
  type HostRequest,
  type MatchSummary,
} from '@/features/matches/use-matches';
import { useMyMatchesRealtime } from '@/features/matches/use-match-realtime';

function StatePill({ label }: { label: string }) {
  return (
    <View className="rounded-lg bg-primary/20 border border-primary-hi/30 px-2.5 py-1">
      <Text className="font-mono text-[9.5px] tracking-[0.11em] uppercase text-primary-hi">
        {label}
      </Text>
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-1 h-9 rounded-lg items-center justify-center',
        active ? 'bg-primary' : '',
      ].join(' ')}
    >
      <Text className={['font-grotesk font-medium text-sm', active ? 'text-neutral' : 'text-neutral/60'].join(' ')}>
        {label}
      </Text>
    </Pressable>
  );
}

function MatchRow({ match, onPress }: { match: MatchSummary; onPress: () => void }) {
  const status = match.currentUserParticipant?.status ?? (match.isHostedByCurrentUser ? 'host' : match.status);
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-1 border border-neutral/10 rounded-2xl mx-5 mb-3 px-4 py-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between gap-3 mb-3">
        <View className="flex-1">
          <Text className="font-grotesk font-bold text-base text-neutral mb-1">
            {match.title}
          </Text>
          <Text className="font-grotesk text-sm text-neutral/60">
            {formatMatchListDateTime(match.starts_at)} · {match.venue_name ?? 'Venue shared by host'}
          </Text>
        </View>
        <StatePill label={status} />
      </View>
      <Text className="font-mono text-[10px] tracking-[0.12em] uppercase text-neutral/38">
        {match.acceptedVisibleCount}/{match.capacity} visible confirmed
      </Text>
    </Pressable>
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
          {request.requester?.display_name ?? 'Player'}
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
          <Text className="font-grotesk font-bold text-sm text-neutral">Accept</Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={isPending}
          className="flex-1 h-11 rounded-xl bg-surface-2 border border-neutral/10 items-center justify-center"
        >
          <Text className="font-grotesk font-bold text-sm text-warning">Reject</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const { data, isPending, error, refetch } = useMyMatches();
  useMyMatchesRealtime(data?.userId ?? null);
  const updateStatus = useUpdateParticipantStatus('');

  async function handleStatus(participantId: string, status: 'accepted' | 'rejected') {
    try {
      await updateStatus.mutateAsync({ participantId, status });
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : 'Could not update request.';
      Alert.alert('Update failed', message);
    }
  }

  const list = tab === 'upcoming' ? data?.upcoming : data?.history;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-6"
    >
      <View style={{ paddingTop: insets.top + 16 }} className="px-5 pb-5">
        <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
          MATCHES
        </Text>
        <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={{ letterSpacing: -0.8 }}>
          Calendar
        </Text>
      </View>

      <View className="mx-5 mb-4 bg-surface-1 border border-neutral/10 rounded-xl h-10 flex-row items-center p-1 gap-1">
        <SegmentButton
          label={`Upcoming · ${data?.upcoming.length ?? 0}`}
          active={tab === 'upcoming'}
          onPress={() => setTab('upcoming')}
        />
        <SegmentButton
          label={`History · ${data?.history.length ?? 0}`}
          active={tab === 'history'}
          onPress={() => setTab('history')}
        />
      </View>

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
        <>
          {data !== undefined && data.hostRequests.length > 0 ? (
            <>
              <View className="px-5 pb-3">
                <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60">
                  Host Inbox
                </Text>
              </View>
              {data.hostRequests.map((request) => (
                <RequestCard
                  key={request.participant.id}
                  request={request}
                  isPending={updateStatus.isPending}
                  onAccept={() => void handleStatus(request.participant.id, 'accepted')}
                  onReject={() => void handleStatus(request.participant.id, 'rejected')}
                />
              ))}
            </>
          ) : null}

          {list !== undefined && list.length > 0 ? (
            list.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                onPress={() => router.push(`/(app)/match-detail?id=${match.id}`)}
              />
            ))
          ) : (
            <View className="items-center mt-10 px-8">
              <Text className="font-grotesk font-bold text-lg text-neutral mb-2">
                No matches here
              </Text>
              <Text className="font-grotesk text-sm text-neutral/60 text-center leading-5">
                Hosted matches and join requests will appear here.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
