-- Optional self-reported gender and birth date for match compatibility hints.
-- birth_date stays private; public_profiles exposes derived age_years only.

create type public.profile_gender as enum ('unspecified', 'male', 'female', 'hidden');

alter table public.profiles
  add column gender public.profile_gender not null default 'unspecified',
  add column birth_date date
    check (
      birth_date is null
      or birth_date <= (current_date - interval '13 years')::date
    );

comment on column public.profiles.gender is
  'Self-reported gender for match fit hints. hidden = user chose not to display publicly.';
comment on column public.profiles.birth_date is
  'Private date of birth. Never expose via public_profiles; only derived age_years.';

drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = off) as
select
  id,
  username,
  display_name,
  avatar_url,
  bio,
  rating_avg,
  rating_count,
  reliability_score,
  penalty_count,
  commitment_count,
  case
    when gender in ('male', 'female') then gender
    else null
  end as gender,
  case
    when birth_date is not null
    then extract(year from age(birth_date))::smallint
    else null
  end as age_years,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Public read surface. gender and age_years are optional self-reported demographics; birth_date is never exposed.';
