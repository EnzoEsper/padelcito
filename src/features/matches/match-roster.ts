import type { Database } from '@/types/database';

type ParticipantRow = Database['public']['Tables']['match_participants']['Row'];

export function maxOpenSpots(totalPlayers: number): number {
  return Math.max(1, totalPlayers - 1);
}

/** Offline confirmed players declared at creation (not in-app participants). */
export function offlineConfirmedCount(capacity: number, openSpots: number): number {
  return Math.max(0, capacity - 1 - openSpots);
}

/** @deprecated Use offlineConfirmedCount */
export function derivedConfirmedCount(totalPlayers: number, openSpots: number): number {
  return offlineConfirmedCount(totalPlayers, openSpots);
}

export function appAcceptedCount(participants: ParticipantRow[]): number {
  return participants.filter((participant) => participant.status === 'accepted').length;
}

export function joinSpotsRemaining(openSpots: number, acceptedAppCount: number): number {
  return Math.max(0, openSpots - acceptedAppCount);
}

export function totalFilled(capacity: number, openSpots: number, acceptedAppCount: number): number {
  return capacity - joinSpotsRemaining(openSpots, acceptedAppCount);
}

export function isJoinFull(openSpots: number, acceptedAppCount: number): boolean {
  return joinSpotsRemaining(openSpots, acceptedAppCount) === 0;
}

export type MatchRosterStats = {
  offlineConfirmedCount: number;
  appAcceptedCount: number;
  joinSpotsRemaining: number;
  totalFilled: number;
  isJoinFull: boolean;
};

export function computeMatchRosterStats(
  capacity: number,
  openSpots: number,
  participants: ParticipantRow[],
): MatchRosterStats {
  const acceptedApp = appAcceptedCount(participants);
  const joinRemaining = joinSpotsRemaining(openSpots, acceptedApp);

  return {
    offlineConfirmedCount: offlineConfirmedCount(capacity, openSpots),
    appAcceptedCount: acceptedApp,
    joinSpotsRemaining: joinRemaining,
    totalFilled: capacity - joinRemaining,
    isJoinFull: joinRemaining === 0,
  };
}

/** One-line roster composition for compact UI (e.g. match detail subtitle). */
export function formatRosterBreakdown(stats: {
  capacity: number;
  offlineConfirmedCount: number;
  appAcceptedCount: number;
  joinSpotsRemaining: number;
}): string {
  const segments = [`${stats.capacity} players`];

  if (stats.offlineConfirmedCount > 0) {
    segments.push(
      stats.offlineConfirmedCount === 1
        ? '1 confirmed offline'
        : `${stats.offlineConfirmedCount} confirmed offline`,
    );
  }

  if (stats.appAcceptedCount > 0) {
    segments.push(
      stats.appAcceptedCount === 1 ? '1 via app' : `${stats.appAcceptedCount} via app`,
    );
  }

  if (stats.joinSpotsRemaining > 0) {
    segments.push(
      stats.joinSpotsRemaining === 1 ? '1 open' : `${stats.joinSpotsRemaining} open`,
    );
  }

  return segments.join(' · ');
}

export type RosterInfoBullet = {
  label: string;
  description: string;
};

export type RosterInfoContent = {
  headline: string;
  bullets: RosterInfoBullet[];
  footnote: string;
};

export function buildRosterInfoContent(stats: {
  capacity: number;
  offlineConfirmedCount: number;
  appAcceptedCount: number;
  joinSpotsRemaining: number;
  totalFilled: number;
}): RosterInfoContent {
  const bullets: RosterInfoBullet[] = [
    {
      label: 'Host (1)',
      description:
        'The person who created the match. The host always counts as one player toward the total.',
    },
  ];

  if (stats.offlineConfirmedCount > 0) {
    bullets.push({
      label:
        stats.offlineConfirmedCount === 1
          ? '1 confirmed offline'
          : `${stats.offlineConfirmedCount} confirmed offline`,
      description:
        'Players the host already has on board — for example friends or club partners. They are reserved on the roster but do not appear as profiles in the app.',
    });
  }

  if (stats.appAcceptedCount > 0) {
    bullets.push({
      label: stats.appAcceptedCount === 1 ? '1 via app' : `${stats.appAcceptedCount} via app`,
      description:
        'Players who requested to join through Padelcito and were accepted by the host.',
    });
  }

  if (stats.joinSpotsRemaining > 0) {
    bullets.push({
      label: stats.joinSpotsRemaining === 1 ? '1 open spot' : `${stats.joinSpotsRemaining} open spots`,
      description:
        'Places still available for new players to request joining through the app.',
    });
  }

  return {
    headline: `This match is set up for ${stats.capacity} players in total.`,
    bullets,
    footnote: `${stats.totalFilled} of ${stats.capacity} roster slots are currently filled.`,
  };
}
