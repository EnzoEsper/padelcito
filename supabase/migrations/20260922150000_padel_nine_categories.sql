-- Padel categories 1–9 (1st = strongest). profile_sports stores padel_category; skill_level stays derived for legacy filters.

alter table public.matches
  drop constraint if exists matches_category_max_check,
  drop constraint if exists matches_category_min_check;

alter table public.matches
  add constraint matches_category_max_check check (category_max between 1 and 9),
  add constraint matches_category_min_check check (category_min between 1 and 9);

comment on column public.matches.category_max is
  'Strongest category accepted (1st = highest level). Lower number = stronger player.';
comment on column public.matches.category_min is
  'Weakest category accepted (9th = lowest level). Higher number = weaker player.';

alter table public.profile_sports
  add column if not exists padel_category smallint check (padel_category between 1 and 9);

update public.profile_sports
set padel_category = case skill_level
  when 'beginner' then 8
  when 'intermediate' then 5
  when 'advanced' then 4
  when 'expert' then 2
  when 'pro' then 1
  else 5
end
where padel_category is null;

alter table public.profile_sports
  alter column padel_category set default 5;

alter table public.profile_sports
  alter column padel_category set not null;

comment on column public.profile_sports.padel_category is
  'Player padel category (1st = strongest, 9th = weakest). skill_level is derived from this band.';

create or replace function public.profile_sports_sync_skill_level()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.padel_category is null then
    raise exception 'padel_category is required';
  end if;

  new.skill_level := case
    when new.padel_category between 7 and 9 then 'beginner'::public.skill_level
    when new.padel_category between 4 and 6 then 'intermediate'::public.skill_level
    when new.padel_category = 3 then 'advanced'::public.skill_level
    when new.padel_category = 2 then 'expert'::public.skill_level
    when new.padel_category = 1 then 'pro'::public.skill_level
    else 'intermediate'::public.skill_level
  end;

  return new;
end;
$$;

drop trigger if exists profile_sports_sync_skill_level on public.profile_sports;

create trigger profile_sports_sync_skill_level
  before insert or update of padel_category on public.profile_sports
  for each row
  execute function public.profile_sports_sync_skill_level();
