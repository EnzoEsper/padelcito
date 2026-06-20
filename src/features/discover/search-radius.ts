export const SEARCH_RADIUS_MIN_KM = 1;
export const SEARCH_RADIUS_MAX_KM = 30;
export const SEARCH_RADIUS_DEFAULT_KM = 10;

export function clampSearchRadiusKm(value: number): number {
  const stepped = Math.round(value);
  return Math.min(SEARCH_RADIUS_MAX_KM, Math.max(SEARCH_RADIUS_MIN_KM, stepped));
}

export function clampSearchRadiusRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

export function radiusKmFromRatio(ratio: number): number {
  const clampedRatio = clampSearchRadiusRatio(ratio);
  return (
    SEARCH_RADIUS_MIN_KM +
    clampedRatio * (SEARCH_RADIUS_MAX_KM - SEARCH_RADIUS_MIN_KM)
  );
}

export function ratioFromRadiusKm(value: number): number {
  const clampedKm = Math.min(
    SEARCH_RADIUS_MAX_KM,
    Math.max(SEARCH_RADIUS_MIN_KM, value),
  );
  return (
    (clampedKm - SEARCH_RADIUS_MIN_KM) /
    (SEARCH_RADIUS_MAX_KM - SEARCH_RADIUS_MIN_KM)
  );
}

export function searchRadiusRatio(value: number): number {
  return ratioFromRadiusKm(clampSearchRadiusKm(value));
}
