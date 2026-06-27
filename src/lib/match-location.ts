import { findPresetLocationByCoords } from '@/features/matches/create-match/preset-locations';
import { parseGeographyPoint } from '@/lib/location';

type MatchLocationFields = {
  location: unknown;
  formatted_address?: string | null;
};

/** Second line under venue title — postal address when available. */
export function resolveMatchLocationSubtitle(match: MatchLocationFields): string | null {
  const stored = match.formatted_address?.trim();
  if (stored !== undefined && stored.length > 0) return stored;

  const coords = parseGeographyPoint(match.location);
  if (coords === null) return null;

  const preset = findPresetLocationByCoords(coords);
  return preset?.formattedAddress ?? null;
}
