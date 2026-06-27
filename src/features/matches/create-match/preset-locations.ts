import type { Coords } from '@/lib/location';

export type PresetLocation = {
  id: string;
  venueName: string;
  /** Picker list line — venue + city shorthand. */
  placeLabel: string;
  /** Maps-style single line for detail screen / DB formatted_address. */
  formattedAddress: string;
  /** Synthetic until Google Places; becomes real place_id after Maps integration. */
  placeId: string;
  coords: Coords;
};

/** Temporary test venues until Google Maps search ships. */
export const PRESET_MATCH_LOCATIONS: PresetLocation[] = [
  {
    id: 'sanfer-padel-club',
    venueName: 'Sanfer Padel Club',
    placeLabel: 'Sanfer Padel Club · Resistencia',
    formattedAddress: 'Alice de Le Saige 152, H3508BXD Resistencia, Chaco',
    placeId: 'preset:sanfer-padel-club',
    coords: { lat: -27.4429666, lng: -58.9747877 },
  },
  {
    id: 'romy-padel',
    venueName: 'Romy Padel',
    placeLabel: 'Romy Padel · Pampa del Infierno',
    formattedAddress: 'Alvear, Sarmiento &, Pampa del Infierno, Chaco',
    placeId: 'preset:romy-padel',
    coords: { lat: -26.501701, lng: -61.1795528 },
  },
  {
    id: 'eiss-padel',
    venueName: 'EISS Pádel',
    placeLabel: 'EISS Pádel · Resistencia',
    formattedAddress: 'Av. Alvear 349, H3500BGQ Resistencia, Chaco',
    placeId: 'preset:eiss-padel',
    coords: { lat: -27.4548835, lng: -58.9966364 },
  },
  {
    id: 'los-tilos-padel',
    venueName: 'Los Tilos Pádel',
    placeLabel: 'Los Tilos Pádel · Corrientes',
    formattedAddress: 'RP5 Km 1.7, W3400 Corrientes',
    placeId: 'preset:los-tilos-padel',
    coords: { lat: -27.488188, lng: -58.7641063 },
  },
];

const COORD_MATCH_EPSILON = 0.0001;

/** Match a stored geography point to a temporary preset venue (testing only). */
export function findPresetLocationByCoords(coords: Coords): PresetLocation | null {
  for (const preset of PRESET_MATCH_LOCATIONS) {
    const latDelta = Math.abs(preset.coords.lat - coords.lat);
    const lngDelta = Math.abs(preset.coords.lng - coords.lng);
    if (latDelta <= COORD_MATCH_EPSILON && lngDelta <= COORD_MATCH_EPSILON) {
      return preset;
    }
  }
  return null;
}
