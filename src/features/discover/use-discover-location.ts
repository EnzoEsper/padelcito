import { useLocationAccess, type LocationAccessStatus } from '@/features/location/use-location-access';
import type { Coords } from '@/lib/location';

export type { LocationAccessStatus, Coords };

export type UseDiscoverLocationReturn = {
  status: LocationAccessStatus;
  coords: Coords | null;
  placeLabel: string | null;
  isLocating: boolean;
  errorMessage: string | null;
  saveWarning: string | null;
  retry: () => Promise<void>;
  openSettings: () => Promise<void>;
};

export function useDiscoverLocation(): UseDiscoverLocationReturn {
  const access = useLocationAccess({
    requestOnMount: true,
    persistToProfile: true,
  });

  return {
    status: access.status,
    coords: access.coords,
    placeLabel: access.placeLabel,
    isLocating: access.isLocating,
    errorMessage: access.errorMessage,
    saveWarning: access.saveWarning,
    retry: access.retry,
    openSettings: access.openSettings,
  };
}
