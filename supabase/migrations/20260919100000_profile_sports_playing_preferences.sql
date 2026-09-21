-- Padel playing preferences on profile_sports (dominant hand + court side).

create type public.dominant_hand as enum (
  'unspecified',
  'right',
  'left',
  'ambidextrous'
);

comment on type public.dominant_hand is
  'Player dominant hand for padel profile; unspecified hides from public summary.';

alter table public.profile_sports
  add column dominant_hand public.dominant_hand not null default 'unspecified',
  add column court_side_preference public.match_position_preference not null default 'any';

comment on column public.profile_sports.dominant_hand is
  'Dominant playing hand. Public via profile_sports RLS.';

comment on column public.profile_sports.court_side_preference is
  'Preferred court side: drive = right, backhand = left. Reuses match_position_preference enum.';
