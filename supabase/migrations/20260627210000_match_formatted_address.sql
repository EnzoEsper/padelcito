-- Maps-ready address fields (Google Places: formatted_address + place_id).
-- Replaces the interim location_label column if it was applied locally.

alter table public.matches
  drop column if exists location_label;

alter table public.matches
  add column if not exists formatted_address text,
  add column if not exists place_id text;

comment on column public.matches.formatted_address is
  'Single-line postal address for display and directions. Typically Google Places formatted_address.';

comment on column public.matches.place_id is
  'Opaque place identifier from the geocoding provider (e.g. Google place_id). Null for legacy manual pins.';

comment on column public.matches.venue_name is
  'Display name of the venue or club. May match the map place name or be host-edited.';

comment on column public.matches.location is
  'WGS84 point for discovery, distance, and map pin. Coordinates come from the place geometry.';
