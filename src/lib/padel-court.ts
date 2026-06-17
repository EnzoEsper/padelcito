import type { Database } from '@/types/database';

export type CourtFormat = Database['public']['Enums']['court_format'];
export type CourtType = Database['public']['Enums']['court_type'];
export type CourtStructure = Database['public']['Enums']['court_structure'];
export type CourtSurface = Database['public']['Enums']['court_surface'];

export const DEFAULT_COURT_FORMAT: CourtFormat = 'doubles';
export const DEFAULT_COURT_TYPE: CourtType = 'indoor';
export const DEFAULT_COURT_STRUCTURE: CourtStructure = 'glass';

export const MAX_COURT_COUNT_DOUBLES = 15;
export const MAX_CAPACITY = 60;

export const COURT_TYPE_OPTIONS: { value: CourtType; label: string }[] = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'semi_indoor', label: 'Semi-indoor' },
];

export const COURT_STRUCTURE_OPTIONS: { value: CourtStructure; label: string }[] = [
  { value: 'glass', label: 'Glass' },
  { value: 'panoramic', label: 'Panoramic' },
  { value: 'concrete', label: 'Concrete' },
];

export const COURT_SURFACE_OPTIONS: { value: CourtSurface; label: string }[] = [
  { value: 'grass', label: 'Grass' },
  { value: 'concrete', label: 'Concrete' },
];

export function playersPerCourt(format: CourtFormat): number {
  return format === 'singles' ? 2 : 4;
}

export function maxCourtCount(format: CourtFormat = DEFAULT_COURT_FORMAT): number {
  return Math.floor(MAX_CAPACITY / playersPerCourt(format));
}

export function minTotalPlayers(courtCount: number, format: CourtFormat = DEFAULT_COURT_FORMAT): number {
  return courtCount * playersPerCourt(format);
}

export function formatCourtTypeLabel(type: CourtType): string {
  return COURT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function formatCourtStructureLabel(structure: CourtStructure): string {
  return COURT_STRUCTURE_OPTIONS.find((o) => o.value === structure)?.label ?? structure;
}

export function formatCourtSurfaceLabel(surface: CourtSurface): string {
  return COURT_SURFACE_OPTIONS.find((o) => o.value === surface)?.label ?? surface;
}

export function courtCapacityLabel(courtCount: number, format: CourtFormat = DEFAULT_COURT_FORMAT): string {
  const perCourt = playersPerCourt(format);
  return `${courtCount} × ${perCourt} players capacity`;
}
