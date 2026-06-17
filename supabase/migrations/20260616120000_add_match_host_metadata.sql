-- Match host metadata: court taxonomy, category range, and optional advanced fields.

create type public.court_format as enum ('singles', 'doubles');
create type public.court_type as enum ('indoor', 'outdoor', 'semi_indoor');
create type public.court_structure as enum ('glass', 'panoramic', 'concrete');
create type public.court_surface as enum ('grass', 'concrete');

create type public.match_gender_preference as enum ('open', 'mixed', 'male', 'female');
create type public.match_difficulty as enum ('friendly', 'competitive');

alter table public.matches
  add column court_count       smallint not null default 1 check (court_count between 1 and 15),
  add column court_format      public.court_format not null default 'doubles',
  add column court_type        public.court_type not null default 'indoor',
  add column court_structure   public.court_structure not null default 'glass',
  add column court_surface     public.court_surface,
  add column category_max      smallint not null default 5 check (category_max between 1 and 8),
  add column category_min      smallint not null default 6 check (category_min between 1 and 8),
  add column price_per_player  numeric(12,2) check (price_per_player is null or price_per_player >= 0),
  add column positions_sought  text[] not null default '{}',
  add column gender_preference public.match_gender_preference,
  add column age_min           smallint check (age_min is null or age_min between 13 and 99),
  add column age_max           smallint check (age_max is null or age_max between 13 and 99),
  add column difficulty        public.match_difficulty,
  add constraint matches_category_range check (category_max <= category_min),
  add constraint matches_age_range check (age_min is null or age_max is null or age_min <= age_max),
  add constraint matches_court_capacity check (
    court_count * case court_format when 'singles' then 2 else 4 end <= capacity
  );

comment on column public.matches.court_count is
  'Number of courts booked. Hard cap 15 for doubles (60 max capacity ÷ 4 players).';
comment on column public.matches.court_format is
  'Singles vs doubles court sizing. MVP client always inserts doubles; exposed in UI later.';
comment on column public.matches.category_max is
  'Strongest category accepted, e.g. 5 = 5ª (UI: Maximum level). Lower number = stronger player.';
comment on column public.matches.category_min is
  'Weakest category accepted, e.g. 7 = 7ª (UI: Minimum level). Higher number = weaker player.';
comment on column public.matches.gender_preference is
  'open = no restriction; mixed = mixed-gender play preferred; male/female = single-gender match.';
comment on column public.matches.court_type is
  'Enclosure / weather protection: indoor, outdoor, or semi-indoor (covered roof, open sides).';
comment on column public.matches.court_structure is
  'Wall construction: glass (standard), panoramic, or concrete/brick.';
comment on column public.matches.court_surface is
  'Playing floor: artificial grass/turf or hard concrete. Nullable when host does not specify.';
