import { parseGeographyPoint } from '@/lib/location';

type MatchLocationFields = {
  location: unknown;
  formatted_address?: string | null;
};

/** Second line under venue title — postal address when available. */
export function resolveMatchLocationSubtitle(match: MatchLocationFields): string | null {
  const stored = match.formatted_address?.trim();
  if (stored !== undefined && stored.length > 0) return stored;
  return null;
}

/** Parse match geography for map display (discover / detail). */
export function resolveMatchCoords(match: MatchLocationFields) {
  return parseGeographyPoint(match.location);
}
