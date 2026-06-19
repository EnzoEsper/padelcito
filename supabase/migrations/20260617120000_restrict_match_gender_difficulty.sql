-- Restrict gender preference to male | female | mixed (remove open) and require both enums on matches.

update public.matches
set gender_preference = 'male'
where gender_preference is null or gender_preference = 'open';

update public.matches
set difficulty = 'friendly'
where difficulty is null;

create type public.match_gender_preference_new as enum ('male', 'female', 'mixed');

alter table public.matches
  alter column gender_preference type public.match_gender_preference_new
  using gender_preference::text::public.match_gender_preference_new;

drop type public.match_gender_preference;
alter type public.match_gender_preference_new rename to match_gender_preference;

alter table public.matches
  alter column gender_preference set default 'male',
  alter column gender_preference set not null;

alter table public.matches
  alter column difficulty set default 'friendly',
  alter column difficulty set not null;

comment on column public.matches.gender_preference is
  'male = men only; female = women only; mixed = mixed-gender match.';

comment on column public.matches.difficulty is
  'friendly = casual play; competitive = more serious match.';
