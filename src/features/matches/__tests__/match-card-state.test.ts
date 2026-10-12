import { resolveMatchCardState } from '@/features/matches/match-card-state';
import { resolveEffectiveMatchStatus } from '@/features/matches/match-lifecycle';
import type { MatchCardStateInput } from '@/features/matches/match-card-state';

function cardInput(overrides: Partial<MatchCardStateInput> = {}): MatchCardStateInput {
  const now = Date.now();
  return {
    starts_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'open',
    joinSpotsRemaining: 3,
    isHostedByCurrentUser: false,
    pendingRequestCount: 0,
    currentUserParticipant: null,
    ...overrides,
  };
}

describe('resolveEffectiveMatchStatus', () => {
  const now = Date.parse('2026-06-15T20:00:00.000Z');

  it('returns cancelled unchanged', () => {
    expect(
      resolveEffectiveMatchStatus(
        {
          starts_at: '2026-06-15T22:00:00.000Z',
          duration_minutes: 60,
          status: 'cancelled',
        },
        now,
      ),
    ).toBe('cancelled');
  });

  it('promotes stale open to in_progress after start', () => {
    expect(
      resolveEffectiveMatchStatus(
        {
          starts_at: '2026-06-15T19:00:00.000Z',
          duration_minutes: 120,
          status: 'open',
        },
        now,
      ),
    ).toBe('in_progress');
  });

  it('promotes stale open to finished after end', () => {
    expect(
      resolveEffectiveMatchStatus(
        {
          starts_at: '2026-06-15T10:00:00.000Z',
          duration_minutes: 60,
          status: 'open',
        },
        now,
      ),
    ).toBe('finished');
  });
});

describe('resolveMatchCardState', () => {
  const now = Date.parse('2026-06-15T20:00:00.000Z');
  const futureStart = '2026-06-15T22:00:00.000Z';

  it('hides viewer status when match is cancelled', () => {
    const state = resolveMatchCardState(
      cardInput({
        starts_at: futureStart,
        status: 'cancelled',
        currentUserParticipant: {
          id: 'p1',
          match_id: 'match-1',
          profile_id: 'user-1',
          status: 'accepted',
          message: null,
          requested_at: new Date().toISOString(),
          responded_at: null,
          left_at: null,
          attempt_count: 0,
          was_late_withdrawal: false,
          was_removed_by_host: false,
        },
      }),
      now,
    );

    expect(state.lifecycle.label).toBe('Cancelled');
    expect(state.viewerStatus).toBeNull();
    expect(state.rosterJoinable).toBe(false);
    expect(state.muted).toBe(true);
    expect(state.accentNeutral).toBe(true);
  });

  it('shows Confirmed for accepted player pre-start', () => {
    const state = resolveMatchCardState(
      cardInput({
        starts_at: futureStart,
        currentUserParticipant: {
          id: 'p1',
          match_id: 'match-1',
          profile_id: 'user-1',
          status: 'accepted',
          message: null,
          requested_at: new Date().toISOString(),
          responded_at: null,
          left_at: null,
          attempt_count: 0,
          was_late_withdrawal: false,
          was_removed_by_host: false,
        },
      }),
      now,
    );

    expect(state.viewerStatus).toEqual({
      label: 'Confirmed',
      tone: 'accepted',
      pulse: false,
    });
    expect(state.rosterJoinable).toBe(true);
  });

  it('shows pending requests for host', () => {
    const state = resolveMatchCardState(
      cardInput({
        starts_at: futureStart,
        isHostedByCurrentUser: true,
        pendingRequestCount: 2,
      }),
      now,
    );

    expect(state.showHostPill).toBe(true);
    expect(state.viewerStatus).toEqual({
      label: '2 Requests',
      tone: 'pending',
      pulse: true,
    });
  });

  it('hides viewer status when live', () => {
    const state = resolveMatchCardState(
      cardInput({
        starts_at: '2026-06-15T19:30:00.000Z',
        duration_minutes: 120,
        status: 'open',
        currentUserParticipant: {
          id: 'p1',
          match_id: 'match-1',
          profile_id: 'user-1',
          status: 'accepted',
          message: null,
          requested_at: new Date().toISOString(),
          responded_at: null,
          left_at: null,
          attempt_count: 0,
          was_late_withdrawal: false,
          was_removed_by_host: false,
        },
      }),
      now,
    );

    expect(state.lifecycle.label).toBe('Live');
    expect(state.viewerStatus).toBeNull();
    expect(state.rosterJoinable).toBe(false);
  });
});
