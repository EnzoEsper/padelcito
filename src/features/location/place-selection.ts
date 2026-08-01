import type { Coords } from '@/lib/location';

/** Normalized place returned by the places-search Edge Function (details action). */
export type SelectedPlace = {
  placeId: string;
  venueName: string | null;
  formattedAddress: string | null;
  coords: Coords;
};

/** Autocomplete row from the places-search Edge Function. */
export type PlaceSuggestion = {
  placeId: string;
  label: string;
  primaryText: string;
  secondaryText: string | null;
};

export type PlacePickerValue = {
  venueName: string;
  coords: Coords;
  formattedAddress: string | null;
  placeId: string | null;
};

export function placeToPickerValue(place: SelectedPlace): PlacePickerValue {
  return {
    venueName: place.venueName?.trim() ?? place.formattedAddress?.trim() ?? 'Selected location',
    coords: place.coords,
    formattedAddress: place.formattedAddress,
    placeId: place.placeId,
  };
}

export function formatPickerSummary(value: PlacePickerValue): string {
  const venue = value.venueName.trim();
  const address = value.formattedAddress?.trim();
  if (venue.length > 0 && address !== undefined && address.length > 0 && venue !== address) {
    return `${venue} · ${address}`;
  }
  if (venue.length > 0) return venue;
  if (address !== undefined && address.length > 0) return address;
  return 'Selected location';
}
