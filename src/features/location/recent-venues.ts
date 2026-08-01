import * as SecureStore from 'expo-secure-store';
import { logger } from '@/lib/logger';
import type { PlacePickerValue } from './place-selection';

/** SecureStore keys: alphanumeric, ".", "-", "_" only — no colons. */
const STORAGE_KEY = 'padelcito.recent_venues.v1';
const MAX_RECENT = 8;

type RecentVenueRecord = {
  placeId: string;
  venueName: string;
  formattedAddress: string | null;
  coords: { lat: number; lng: number };
  usedAt: string;
};

function isRecentVenueRecord(value: unknown): value is RecentVenueRecord {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.placeId === 'string' &&
    typeof row.venueName === 'string' &&
    typeof row.usedAt === 'string' &&
    typeof row.coords === 'object' &&
    row.coords !== null &&
    typeof (row.coords as Record<string, unknown>).lat === 'number' &&
    typeof (row.coords as Record<string, unknown>).lng === 'number' &&
    (row.formattedAddress === null || typeof row.formattedAddress === 'string')
  );
}

async function readRecords(): Promise<RecentVenueRecord[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw === null || raw.length === 0) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentVenueRecord);
  } catch (err) {
    logger.warn('readRecentVenues failed', err);
    return [];
  }
}

async function writeRecords(records: RecentVenueRecord[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    logger.warn('writeRecentVenues failed', err);
  }
}

export async function loadRecentVenues(): Promise<PlacePickerValue[]> {
  const records = await readRecords();
  return records
    .sort((a, b) => b.usedAt.localeCompare(a.usedAt))
    .slice(0, MAX_RECENT)
    .map((row) => ({
      placeId: row.placeId,
      venueName: row.venueName,
      formattedAddress: row.formattedAddress,
      coords: row.coords,
    }));
}

export async function rememberRecentVenue(value: PlacePickerValue): Promise<void> {
  if (value.placeId === null || value.placeId.trim().length === 0) return;

  const records = await readRecords();
  const next: RecentVenueRecord = {
    placeId: value.placeId,
    venueName: value.venueName.trim() || value.formattedAddress?.trim() || 'Venue',
    formattedAddress: value.formattedAddress,
    coords: value.coords,
    usedAt: new Date().toISOString(),
  };

  const filtered = records.filter((row) => row.placeId !== next.placeId);
  filtered.unshift(next);
  await writeRecords(filtered.slice(0, MAX_RECENT));
}
