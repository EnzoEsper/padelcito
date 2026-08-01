import { useCallback, useEffect, useRef, useState } from 'react';
import {
  autocompletePlaces,
  fetchPlaceDetails,
  PlacesClientError,
  type PlaceDetailsParams,
} from './places-client';
import { createPlacesSessionToken } from './session-token';
import type { Coords } from '@/lib/location';
import type { PlaceSuggestion, SelectedPlace } from './place-selection';

export type PlaceSearchState = {
  query: string;
  setQuery: (value: string) => void;
  suggestions: PlaceSuggestion[];
  isSearching: boolean;
  searchError: string | null;
  runSearch: () => Promise<void>;
  selectSuggestion: (suggestion: PlaceSuggestion) => Promise<SelectedPlace | null>;
  resolveRecentPlace: (placeId: string) => Promise<SelectedPlace | null>;
  clearSearchError: () => void;
};

type UsePlaceSearchOptions = {
  biasCoords: Coords | null;
};

export function usePlaceSearch(options: UsePlaceSearchOptions): PlaceSearchState {
  const { biasCoords } = options;
  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const sessionTokenRef = useRef(createPlacesSessionToken());
  const abortRef = useRef<AbortController | null>(null);

  const resetSessionToken = useCallback((): void => {
    sessionTokenRef.current = createPlacesSessionToken();
  }, []);

  const cancelInFlight = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cancelInFlight();
    };
  }, [cancelInFlight]);

  const setQuery = useCallback((value: string): void => {
    setQueryState(value);
    setSearchError(null);
  }, []);

  const clearSearchError = useCallback((): void => {
    setSearchError(null);
  }, []);

  const runSearch = useCallback(async (): Promise<void> => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSearchError('Type at least 3 characters, then tap Search.');
      setSuggestions([]);
      return;
    }

    cancelInFlight();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await autocompletePlaces({
        input: trimmed,
        sessionToken: sessionTokenRef.current,
        coords: biasCoords,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      setSuggestions(results);
      if (results.length === 0) {
        setSearchError('No places found. Try a different name or move the pin on the map.');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof PlacesClientError
          ? err.message
          : 'Could not search places. Try again.';
      setSearchError(message);
      setSuggestions([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [biasCoords, cancelInFlight, query]);

  const loadDetails = useCallback(
    async (params: Omit<PlaceDetailsParams, 'sessionToken'>): Promise<SelectedPlace | null> => {
      cancelInFlight();
      setIsSearching(true);
      setSearchError(null);

      try {
        const place = await fetchPlaceDetails({
          ...params,
          sessionToken: sessionTokenRef.current,
        });
        resetSessionToken();
        return place;
      } catch (err) {
        const message =
          err instanceof PlacesClientError
            ? err.message
            : 'Could not load place details. Try again or move the pin.';
        setSearchError(message);
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    [cancelInFlight, resetSessionToken],
  );

  const selectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion): Promise<SelectedPlace | null> => {
      return loadDetails({ placeId: suggestion.placeId });
    },
    [loadDetails],
  );

  const resolveRecentPlace = useCallback(
    async (placeId: string): Promise<SelectedPlace | null> => {
      return loadDetails({ placeId });
    },
    [loadDetails],
  );

  return {
    query,
    setQuery,
    suggestions,
    isSearching,
    searchError,
    runSearch,
    selectSuggestion,
    resolveRecentPlace,
    clearSearchError,
  };
}
