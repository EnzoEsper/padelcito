import type { LocationGeocodedAddress } from 'expo-location';

export type Coords = { lat: number; lng: number };

export function coordsToWkt(coords: Coords): unknown {
  return `POINT(${coords.lng} ${coords.lat})` as unknown;
}

function formatCoord(value: number, posLabel: string, negLabel: string): string {
  const label = value >= 0 ? posLabel : negLabel;
  return `${Math.abs(value).toFixed(4)}° ${label}`;
}

export function formatCoordsLabel(coords: Coords): string {
  return `${formatCoord(coords.lat, 'N', 'S')} · ${formatCoord(coords.lng, 'E', 'W')}`;
}

export function formatPlaceLabel(address: LocationGeocodedAddress | undefined): string | null {
  if (address === undefined) return null;

  const district =
    address.district ?? address.subregion ?? address.name ?? address.street ?? null;
  const city = address.city ?? address.region ?? null;

  if (district !== null && city !== null && district !== city) {
    return `${district} · ${city}`;
  }
  if (city !== null) return city;
  if (district !== null) return district;
  return null;
}

export function resolvePlaceLabel(
  geocoded: LocationGeocodedAddress | undefined,
  coords: Coords,
): string {
  const fromGeocode = formatPlaceLabel(geocoded);
  if (fromGeocode !== null) return fromGeocode;
  return formatCoordsLabel(coords);
}

/** Round coords for stable TanStack Query cache keys. */
export function roundCoordsForKey(coords: Coords): Coords {
  return {
    lat: Math.round(coords.lat * 1000) / 1000,
    lng: Math.round(coords.lng * 1000) / 1000,
  };
}
