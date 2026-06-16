import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import {
  coordsToWkt,
  resolvePlaceLabel,
  type Coords,
} from '@/lib/location';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

export type { Coords };

export type LocationAccessStatus =
  | 'idle'
  | 'locating'
  | 'ready'
  | 'denied'
  | 'blocked'
  | 'services_disabled'
  | 'error';

type UseLocationAccessOptions = {
  /** When true, automatically runs the permission + fetch pipeline on mount. */
  requestOnMount?: boolean;
  /** Persist coords to profiles.home_location after a successful fix. */
  persistToProfile?: boolean;
};

export type UseLocationAccessReturn = {
  status: LocationAccessStatus;
  coords: Coords | null;
  placeLabel: string | null;
  errorMessage: string | null;
  saveWarning: string | null;
  isLocating: boolean;
  retry: () => Promise<void>;
  openSettings: () => Promise<void>;
};

const DENIED_MESSAGE =
  'Padelcito uses your location to find nearby padel matches. Enable location to continue.';
const BLOCKED_MESSAGE =
  'Location access is turned off. Open Settings to allow location while using the app.';
const SERVICES_DISABLED_MESSAGE =
  'Location services are turned off on this device. Enable them in Settings to find nearby matches.';
const FETCH_ERROR_MESSAGE = 'Could not get your location. Please try again.';
const AUTH_ERROR_MESSAGE = 'Your session has expired. Please sign in again.';

async function fetchDeviceCoords(): Promise<Coords> {
  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  if (lastKnown !== null) {
    return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

async function reverseGeocode(coords: Coords): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    return resolvePlaceLabel(results[0], coords);
  } catch (err) {
    logger.warn('reverseGeocodeAsync failed', err);
    return resolvePlaceLabel(undefined, coords);
  }
}

async function persistHomeLocation(
  userId: string,
  coords: Coords,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    home_location: coordsToWkt(coords),
  });

  if (error !== null) {
    logger.error('persistHomeLocation failed', error);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

function permissionStatusFromResponse(
  response: Location.LocationPermissionResponse,
): 'denied' | 'blocked' {
  if (!response.canAskAgain) {
    return 'blocked';
  }
  return 'denied';
}

export function useLocationAccess(options: UseLocationAccessOptions = {}): UseLocationAccessReturn {
  const { requestOnMount = false, persistToProfile = true } = options;
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<LocationAccessStatus>('idle');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  const runIdRef = useRef(0);
  const hasAutoRequestedRef = useRef(false);

  const isLocating = status === 'idle' || status === 'locating';

  const openSettings = useCallback(async (): Promise<void> => {
    await Linking.openSettings();
  }, []);

  const runPipeline = useCallback(
    async (requestPermission: boolean): Promise<void> => {
      const runId = ++runIdRef.current;
      setStatus('locating');
      setErrorMessage(null);
      setSaveWarning(null);

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (runId !== runIdRef.current) return;
          setCoords(null);
          setPlaceLabel(null);
          setStatus('services_disabled');
          setErrorMessage(SERVICES_DISABLED_MESSAGE);
          return;
        }

        let permission = await Location.getForegroundPermissionsAsync();

        if (
          requestPermission &&
          permission.status !== Location.PermissionStatus.GRANTED
        ) {
          permission = await Location.requestForegroundPermissionsAsync();
        }

        if (runId !== runIdRef.current) return;

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          const nextStatus = permissionStatusFromResponse(permission);
          setCoords(null);
          setPlaceLabel(null);
          setStatus(nextStatus);
          setErrorMessage(nextStatus === 'blocked' ? BLOCKED_MESSAGE : DENIED_MESSAGE);
          return;
        }

        const nextCoords = await fetchDeviceCoords();
        if (runId !== runIdRef.current) return;

        const label = await reverseGeocode(nextCoords);
        if (runId !== runIdRef.current) return;

        if (persistToProfile) {
          const { data: authData, error: userError } = await supabase.auth.getUser();
          if (userError !== null || authData.user === null) {
            setCoords(null);
            setPlaceLabel(null);
            setStatus('error');
            setErrorMessage(AUTH_ERROR_MESSAGE);
            return;
          }

          const saveResult = await persistHomeLocation(authData.user.id, nextCoords);
          if (runId !== runIdRef.current) return;

          if (!saveResult.ok) {
            setSaveWarning('Location works for now but could not be saved to your profile.');
          } else {
            void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
          }
        }

        setCoords(nextCoords);
        setPlaceLabel(label);
        setStatus('ready');
        setErrorMessage(null);
      } catch (err) {
        logger.error('useLocationAccess: pipeline failed', err);
        if (runId !== runIdRef.current) return;
        setCoords(null);
        setPlaceLabel(null);
        setStatus('error');
        setErrorMessage(FETCH_ERROR_MESSAGE);
      }
    },
    [persistToProfile, queryClient],
  );

  const retry = useCallback(async (): Promise<void> => {
    await runPipeline(true);
  }, [runPipeline]);

  useEffect(() => {
    if (!requestOnMount || hasAutoRequestedRef.current) return;
    hasAutoRequestedRef.current = true;
    void runPipeline(true);
  }, [requestOnMount, runPipeline]);

  useEffect(() => {
    const appStateRef = { current: AppState.currentState };

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      const wasBackground =
        appStateRef.current === 'inactive' || appStateRef.current === 'background';
      appStateRef.current = nextState;

      if (wasBackground && nextState === 'active') {
        void runPipeline(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [runPipeline]);

  return {
    status,
    coords,
    placeLabel,
    errorMessage,
    saveWarning,
    isLocating,
    retry,
    openSettings,
  };
}
