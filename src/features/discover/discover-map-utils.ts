import type { Region } from 'react-native-maps';
import type { Coords } from '@/lib/location';
import type { MatchSummary } from '@/features/matches/use-matches';

export const DISCOVER_DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#141417' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0b0b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232429' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1118' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1b1c21' }] },
] as { elementType?: string; featureType?: string; stylers: object[] }[];

/** Approximate latitudeDelta that frames a search radius in km. */
export function deltaFromRadiusKm(radiusKm: number): number {
  const paddedKm = radiusKm * 2.2;
  return Math.max(0.01, Math.min(0.45, paddedKm / 111));
}

export function coordsToRegion(coords: Coords, delta = 0.012): Region {
  return {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function regionToCoords(region: Region): Coords {
  return { lat: region.latitude, lng: region.longitude };
}

export function regionToBBox(region: Region): [number, number, number, number] {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return [
    region.longitude - halfLng,
    region.latitude - halfLat,
    region.longitude + halfLng,
    region.latitude + halfLat,
  ];
}

export function regionToZoom(region: Region): number {
  return Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
}

export function coordsRoughlyEqual(left: Coords, right: Coords, thresholdM = 400): boolean {
  const latDiff = Math.abs(left.lat - right.lat);
  const lngDiff = Math.abs(left.lng - right.lng);
  const latM = latDiff * 111_000;
  const lngM = lngDiff * 111_000 * Math.cos((left.lat * Math.PI) / 180);
  return Math.hypot(latM, lngM) < thresholdM;
}

export type MapMatchPoint = MatchSummary & { coords: Coords };

export function matchesWithCoords(matches: MatchSummary[]): MapMatchPoint[] {
  return matches.flatMap((match) => {
    if (match.coords === undefined || match.coords === null) return [];
    return [{ ...match, coords: match.coords }];
  });
}
