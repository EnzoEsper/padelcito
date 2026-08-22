import {
  canHostCancelMatch,
  canPlayerWithdraw,
  isMatchPreStart,
} from '@/features/matches/match-lifecycle';
import type { Database } from '@/types/database';

type ParticipantRow = Database['public']['Tables']['match_participants']['Row'];

function acceptedParticipant(): ParticipantRow {
  return {
    attempt_count: 0,
    id: 'participant-1',
    left_at: null,
    match_id: 'match-1',
    profile_id: 'profile-1',
    status: 'accepted',
    message: null,
    requested_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
    was_late_withdrawal: false,
    was_removed_by_host: false,
  };
}

describe('match lifecycle client mirrors', () => {
  const futureStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const pastStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const now = Date.now();

  it('treats open future matches as pre-start', () => {
    expect(isMatchPreStart({ starts_at: futureStart, status: 'open' }, now)).toBe(true);
    expect(canHostCancelMatch({ starts_at: futureStart, status: 'open' }, now)).toBe(true);
  });

  it('blocks roster actions after start or when cancelled', () => {
    expect(isMatchPreStart({ starts_at: pastStart, status: 'open' }, now)).toBe(false);
    expect(canHostCancelMatch({ starts_at: pastStart, status: 'open' }, now)).toBe(false);
    expect(canHostCancelMatch({ starts_at: futureStart, status: 'cancelled' }, now)).toBe(false);
  });

  it('allows accepted players to withdraw only pre-start', () => {
    expect(
      canPlayerWithdraw(
        {
          starts_at: futureStart,
          status: 'open',
          isHost: false,
          currentUserParticipant: acceptedParticipant(),
        },
        now,
      ),
    ).toBe(true);

    expect(
      canPlayerWithdraw(
        {
          starts_at: pastStart,
          status: 'in_progress',
          isHost: false,
          currentUserParticipant: acceptedParticipant(),
        },
        now,
      ),
    ).toBe(false);
  });
});
