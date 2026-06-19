import type { Database } from '@/types/database';

export type PositionPreference = Database['public']['Enums']['match_position_preference'];

export const POSITION_PREFERENCE_OPTIONS: { value: PositionPreference; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'drive', label: 'Drive' },
  { value: 'backhand', label: 'Backhand' },
];
