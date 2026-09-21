import type { Database } from '@/types/database';

export type PositionPreference = Database['public']['Enums']['match_position_preference'];
export type DominantHand = Database['public']['Enums']['dominant_hand'];

export const POSITION_PREFERENCE_OPTIONS: {
  value: PositionPreference;
  label: string;
  description: string;
}[] = [
  { value: 'any', label: 'Either side', description: 'Comfortable on both sides' },
  { value: 'drive', label: 'Drive (right)', description: 'Right side of the court' },
  { value: 'backhand', label: 'Backhand (left)', description: 'Left side of the court' },
];

export const DOMINANT_HAND_OPTIONS: {
  value: DominantHand;
  label: string;
  description?: string;
}[] = [
  { value: 'unspecified', label: 'Prefer not to say' },
  { value: 'right', label: 'Right-handed' },
  { value: 'left', label: 'Left-handed' },
  { value: 'ambidextrous', label: 'Ambidextrous' },
];

export const PLAYER_COURT_SIDE_OPTIONS = POSITION_PREFERENCE_OPTIONS;

export function formatPositionLabel(position: PositionPreference): string {
  return (
    POSITION_PREFERENCE_OPTIONS.find((option) => option.value === position)?.label ?? position
  );
}

/** Host-facing label for match open-spot constraints. */
export function formatMatchSeekingPositionLabel(position: PositionPreference): string {
  if (position === 'any') {
    return 'Any side';
  }
  return `Seeking: ${formatPositionLabel(position)}`;
}

/** Player-facing label for profile court preference. */
export function formatPlayerCourtSideLabel(position: PositionPreference): string {
  if (position === 'any') {
    return 'Either side';
  }
  return `Plays: ${formatPositionLabel(position)}`;
}

export function formatDominantHandLabel(hand: DominantHand): string | null {
  if (hand === 'unspecified') {
    return null;
  }
  return DOMINANT_HAND_OPTIONS.find((option) => option.value === hand)?.label ?? hand;
}

export type PlayingProfileParts = {
  dominantHand: DominantHand | null;
  courtSide: PositionPreference | null;
  yearsPlaying: number | null;
};

export function formatPlayingProfileSummary(parts: PlayingProfileParts): string | null {
  const segments: string[] = [];

  if (parts.dominantHand !== null && parts.dominantHand !== 'unspecified') {
    const handLabel = formatDominantHandLabel(parts.dominantHand);
    if (handLabel !== null) {
      segments.push(handLabel);
    }
  }

  if (parts.courtSide !== null && parts.courtSide !== 'any') {
    segments.push(formatPositionLabel(parts.courtSide));
  } else if (
    parts.courtSide === 'any' &&
    parts.dominantHand !== null &&
    parts.dominantHand !== 'unspecified'
  ) {
    segments.push('Either side');
  }

  if (parts.yearsPlaying !== null && parts.yearsPlaying > 0) {
    const years = parts.yearsPlaying;
    segments.push(`${years} yr${years === 1 ? '' : 's'}`);
  }

  if (segments.length === 0) {
    return null;
  }

  return segments.join(' · ');
}
