import * as Location from 'expo-location';
import { resolvePlaceLabel, type Coords } from '@/lib/location';
import { logger } from '@/lib/logger';

export type PinGeocodeResult = {
  coords: Coords;
  formattedAddress: string | null;
  venueName: string | null;
};

export async function reverseGeocodePin(coords: Coords): Promise<PinGeocodeResult> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    const first = results[0];
    if (first === undefined) {
      return {
        coords,
        formattedAddress: null,
        venueName: null,
      };
    }

    const parts = [
      first.name,
      first.street,
      first.streetNumber,
      first.city ?? first.subregion,
      first.region,
    ]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map((part) => part.trim());

    const formattedAddress = parts.length > 0 ? parts.join(', ') : null;
    const venueName =
      typeof first.name === 'string' && first.name.trim().length > 0
        ? first.name.trim()
        : typeof first.street === 'string' && first.street.trim().length > 0
          ? first.street.trim()
          : null;

    return {
      coords,
      formattedAddress,
      venueName,
    };
  } catch (err) {
    logger.warn('reverseGeocodePin failed', err);
    return {
      coords,
      formattedAddress: resolvePlaceLabel(undefined, coords),
      venueName: null,
    };
  }
}
