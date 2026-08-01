import { supabase } from '@/lib/supabase';
import type { Coords } from '@/lib/location';
import type { PlaceSuggestion, SelectedPlace } from './place-selection';

const PLACES_FUNCTION = 'places-search';
const CLIENT_TIMEOUT_MS = 8_500;

type PlacesClientErrorCode =
  | 'unauthorized'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'invalid_response'
  | 'server'
  | 'unknown';

export class PlacesClientError extends Error {
  readonly code: PlacesClientErrorCode;

  constructor(code: PlacesClientErrorCode, message: string) {
    super(message);
    this.name = 'PlacesClientError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSuggestions(data: unknown): PlaceSuggestion[] {
  if (!isRecord(data) || !Array.isArray(data.suggestions)) {
    return [];
  }

  const results: PlaceSuggestion[] = [];
  for (const item of data.suggestions) {
    if (!isRecord(item)) continue;
    const placeId = item.placeId;
    const label = item.label;
    const primaryText = item.primaryText;
    if (typeof placeId !== 'string' || typeof label !== 'string') continue;
    results.push({
      placeId,
      label,
      primaryText: typeof primaryText === 'string' ? primaryText : label,
      secondaryText: typeof item.secondaryText === 'string' ? item.secondaryText : null,
    });
  }
  return results;
}

function parseSelectedPlace(data: unknown): SelectedPlace | null {
  if (!isRecord(data) || !isRecord(data.place)) return null;
  const place = data.place;
  const placeId = place.placeId;
  const coordsRaw = place.coords;
  if (typeof placeId !== 'string' || !isRecord(coordsRaw)) return null;
  const lat = coordsRaw.lat;
  const lng = coordsRaw.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  return {
    placeId,
    venueName: typeof place.venueName === 'string' ? place.venueName : null,
    formattedAddress:
      typeof place.formattedAddress === 'string' ? place.formattedAddress : null,
    coords: { lat, lng },
  };
}

function mapInvokeError(message: string): PlacesClientError {
  const lower = message.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return new PlacesClientError('unauthorized', 'Sign in again to search for places.');
  }
  if (lower.includes('429') || lower.includes('too many')) {
    return new PlacesClientError('rate_limited', 'Too many searches. Wait a minute and try again.');
  }
  return new PlacesClientError('server', message);
}

async function invokePlacesFunction(
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<unknown> {
  const invokePromise = supabase.functions.invoke(PLACES_FUNCTION, { body });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new PlacesClientError('timeout', 'Search timed out. Try again.'));
    }, CLIENT_TIMEOUT_MS);
  });

  const abortPromise = new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(new PlacesClientError('timeout', 'Search was cancelled.'));
      return;
    }
    signal.addEventListener(
      'abort',
      () => {
        reject(new PlacesClientError('timeout', 'Search was cancelled.'));
      },
      { once: true },
    );
  });

  try {
    const result = await Promise.race([invokePromise, timeoutPromise, abortPromise]);
    const { data, error } = result;

    if (error !== null) {
      throw mapInvokeError(error.message ?? 'Places search failed.');
    }

    if (isRecord(data) && typeof data.error === 'string') {
      throw mapInvokeError(data.error);
    }

    return data;
  } catch (err) {
    if (err instanceof PlacesClientError) throw err;
    throw new PlacesClientError('network', 'Could not reach place search. Check your connection.');
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export type AutocompleteParams = {
  input: string;
  sessionToken: string;
  coords?: Coords | null;
  languageCode?: string;
  signal: AbortSignal;
};

export async function autocompletePlaces(params: AutocompleteParams): Promise<PlaceSuggestion[]> {
  const body: Record<string, unknown> = {
    action: 'autocomplete',
    input: params.input.trim(),
    sessionToken: params.sessionToken,
    languageCode: params.languageCode ?? 'es',
  };

  if (params.coords !== null && params.coords !== undefined) {
    body.lat = params.coords.lat;
    body.lng = params.coords.lng;
  }

  const data = await invokePlacesFunction(body, params.signal);
  return parseSuggestions(data);
}

export type PlaceDetailsParams = {
  placeId: string;
  sessionToken: string;
  languageCode?: string;
  signal?: AbortSignal;
};

export async function fetchPlaceDetails(params: PlaceDetailsParams): Promise<SelectedPlace> {
  const signal = params.signal ?? new AbortController().signal;
  const body = {
    action: 'details',
    placeId: params.placeId,
    sessionToken: params.sessionToken,
    languageCode: params.languageCode ?? 'es',
  };

  const data = await invokePlacesFunction(body, signal);
  const place = parseSelectedPlace(data);
  if (place === null) {
    throw new PlacesClientError('invalid_response', 'Could not read place details.');
  }
  return place;
}
