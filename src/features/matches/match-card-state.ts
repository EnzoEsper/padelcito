import {
  isEffectiveMatchPreStart,
  resolveEffectiveMatchStatus,
  type MatchLifecycleFields,
} from '@/features/matches/match-lifecycle';
import {
  resolveMatchStatusBadge,
  type MatchStatusBadgeConfig,
  type ParticipantStatusMembershipTone,
} from '@/features/matches/match-status-labels';
import type { Database } from '@/types/database';
type ParticipantStatus = Database['public']['Enums']['participant_status'];

/** Minimal fields required to resolve card UI state (avoids importing use-matches in tests). */
export type MatchCardStateInput = {
  starts_at: string;
  duration_minutes: number;
  status: Database['public']['Enums']['match_status'];
  joinSpotsRemaining: number;
  isHostedByCurrentUser: boolean;
  pendingRequestCount?: number;
  currentUserParticipant: { status: ParticipantStatus } | null;
};

export type MatchCardViewerStatus = {
  label: string;
  tone: ParticipantStatusMembershipTone;
  pulse: boolean;
};

export type MatchCardState = {
  lifecycle: MatchStatusBadgeConfig;
  showHostPill: boolean;
  viewerStatus: MatchCardViewerStatus | null;
  rosterJoinable: boolean;
  muted: boolean;
  accentNeutral: boolean;
};

function viewerStatusForParticipant(status: ParticipantStatus): MatchCardViewerStatus | null {
  switch (status) {
    case 'pending':
      return { label: 'Pending', tone: 'pending', pulse: true };
    case 'accepted':
      return { label: 'Confirmed', tone: 'accepted', pulse: false };
    case 'rejected':
    case 'withdrawn':
    case 'removed':
    case 'cancelled':
      return null;
  }
}

function hostPendingRequestsLabel(count: number): MatchCardViewerStatus {
  const label = count === 1 ? '1 Request' : `${count} Requests`;
  return { label, tone: 'pending', pulse: true };
}

export function resolveMatchCardState(
  match: MatchCardStateInput,
  nowMs: number = Date.now(),
): MatchCardState {
  const lifecycleFields: MatchLifecycleFields = {
    starts_at: match.starts_at,
    duration_minutes: match.duration_minutes,
    status: match.status,
  };
  const effectiveStatus = resolveEffectiveMatchStatus(lifecycleFields, nowMs);
  const lifecycle = resolveMatchStatusBadge(effectiveStatus);
  const preStart = isEffectiveMatchPreStart(lifecycleFields, nowMs);

  const muted = effectiveStatus === 'finished' || effectiveStatus === 'cancelled';
  const accentNeutral = effectiveStatus === 'cancelled';

  const rosterJoinable =
    effectiveStatus === 'open' && match.joinSpotsRemaining > 0 && preStart;

  let viewerStatus: MatchCardViewerStatus | null = null;

  if (preStart && effectiveStatus !== 'cancelled') {
    if (match.isHostedByCurrentUser) {
      const pendingCount = match.pendingRequestCount ?? 0;
      if (pendingCount > 0) {
        viewerStatus = hostPendingRequestsLabel(pendingCount);
      }
    } else {
      const participantStatus = match.currentUserParticipant?.status;
      if (participantStatus !== undefined) {
        viewerStatus = viewerStatusForParticipant(participantStatus);
      }
    }
  }

  return {
    lifecycle,
    showHostPill: match.isHostedByCurrentUser,
    viewerStatus,
    rosterJoinable,
    muted,
    accentNeutral,
  };
}
