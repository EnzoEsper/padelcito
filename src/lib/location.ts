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

export type ParseCoordsResult =
  | { ok: true; coords: Coords }
  | { ok: false; message: string };

/** Parse "lat, lng" or "lat lng" from clipboard text. */
export function parseCoordsFromText(text: string): ParseCoordsResult {
  const normalized = text.trim().replace(/[;,]/g, ' ').replace(/\s+/g, ' ');
  const parts = normalized.split(' ').filter((part) => part.length > 0);

  if (parts.length < 2) {
    return { ok: false, message: 'Paste coordinates as "latitude, longitude".' };
  }

  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, message: 'Could not read latitude and longitude from clipboard.' };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, message: 'Coordinates are out of range.' };
  }

  return { ok: true, coords: { lat, lng } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse PostgREST geography/GeoJSON or WKT POINT into lat/lng. */
export function parseGeographyPoint(location: unknown): Coords | null {
  if (typeof location === 'string') {
    const wktMatch = location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/iu);
    if (wktMatch !== null) {
      const lng = Number.parseFloat(wktMatch[1]);
      const lat = Number.parseFloat(wktMatch[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  }

  if (!isRecord(location)) return null;

  if (location.type === 'Point' && Array.isArray(location.coordinates)) {
    const [lngRaw, latRaw] = location.coordinates;
    const lng = typeof lngRaw === 'number' ? lngRaw : Number.parseFloat(String(lngRaw));
    const lat = typeof latRaw === 'number' ? latRaw : Number.parseFloat(String(latRaw));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters between two WGS84 coordinates. */
export function distanceMeters(from: Coords, to: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}
