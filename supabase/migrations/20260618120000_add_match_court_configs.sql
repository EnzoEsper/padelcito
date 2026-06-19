-- Per-court configs (format, type, structure, surface) as a JSON array aligned with court_count.
-- Validation uses functions because PostgreSQL forbids subqueries in CHECK constraints.

create or replace function public.matches_court_configs_are_valid(
  p_configs jsonb,
  p_court_count smallint
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_configs) = 'array'
    and jsonb_array_length(p_configs) = p_court_count
    and not exists (
      select 1
      from jsonb_array_elements(p_configs) as e(elem)
      where jsonb_typeof(e.elem) <> 'object'
        or (e.elem->>'format') not in ('singles', 'doubles')
        or (e.elem->>'type') not in ('indoor', 'outdoor', 'semi_indoor')
        or (e.elem->>'structure') not in ('glass', 'panoramic', 'concrete')
        or (e.elem->>'surface') not in ('grass', 'concrete')
    );
$$;

create or replace function public.matches_court_capacity_fits(
  p_configs jsonb,
  p_capacity smallint
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    (
      select sum(
        case when (e.elem->>'format') = 'singles' then 2 else 4 end
      )::integer
      from jsonb_array_elements(p_configs) as e(elem)
    ),
    0
  ) <= p_capacity;
$$;

alter table public.matches
  add column court_configs jsonb not null default '[{"format":"doubles","type":"indoor","structure":"glass","surface":"grass"}]'::jsonb;

alter table public.matches
  drop constraint matches_court_capacity;

alter table public.matches
  add constraint matches_court_configs_valid
  check (public.matches_court_configs_are_valid(court_configs, court_count));

alter table public.matches
  add constraint matches_court_capacity
  check (public.matches_court_capacity_fits(court_configs, capacity));

comment on column public.matches.court_configs is
  'Per-court setup: [{ format, type, structure, surface }, …]. Length must equal court_count.';

comment on function public.matches_court_configs_are_valid(jsonb, smallint) is
  'Validates court_configs array length and per-court enum fields. Used by matches CHECK constraint.';

comment on function public.matches_court_capacity_fits(jsonb, smallint) is
  'Ensures sum of per-court player slots (singles=2, doubles=4) does not exceed match capacity.';
