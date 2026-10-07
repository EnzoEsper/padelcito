-- Community post event attributes and shape validation.

alter table public.community_posts
  add column subtype public.community_post_subtype,
  add column tags public.community_post_tag[] not null default '{}'::public.community_post_tag[],
  add column scoring_format public.community_post_scoring_format,
  add column golden_point boolean,
  add column guaranteed_matches smallint check (
    guaranteed_matches is null or guaranteed_matches between 1 and 10
  ),
  add column rules_note text check (rules_note is null or char_length(rules_note) <= 500),
  add column rules_image_paths text[] not null default '{}'::text[],
  add column entry_fee integer check (entry_fee is null or entry_fee >= 0),
  add column fee_unit public.community_post_fee_unit,
  add column registration_deadline timestamptz;

alter table public.community_posts
  add constraint community_posts_tags_cardinality
    check (cardinality(tags) <= 12),
  add constraint community_posts_rules_images_cardinality
    check (cardinality(rules_image_paths) <= 3),
  add constraint community_posts_fee_unit_consistency
    check (
      (entry_fee is null and fee_unit is null)
      or (entry_fee is not null and fee_unit is not null)
    ),
  add constraint community_posts_registration_deadline_before_start
    check (
      registration_deadline is null
      or event_start is null
      or registration_deadline <= event_start
    );

comment on column public.community_posts.rules_image_paths is
  'Storage paths under community-posts bucket; must belong to author_id prefix.';

create or replace function public.community_post_subtype_allowed(
  p_type public.community_post_type,
  p_subtype public.community_post_subtype
)
returns boolean
language sql
immutable
as $$
  select case p_type
    when 'tournament' then p_subtype in (
      'elimination', 'groups_knockout', 'round_robin', 'americano', 'teams'
    )
    when 'social' then p_subtype in ('americano', 'mexicano', 'pozo', 'mixer')
    when 'league' then p_subtype in ('pairs', 'teams', 'ladder')
    when 'training' then p_subtype in ('clinic', 'group_class', 'camp', 'coach_course')
    when 'special_event' then p_subtype in ('exhibition', 'festival', 'corporate', 'other')
    else false
  end;
$$;

create or replace function public.validate_community_post_shape()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid;
  v_path text;
  v_prefix text;
begin
  if new.subtype is not null
     and not public.community_post_subtype_allowed(new.type, new.subtype) then
    raise exception 'Invalid subtype % for post type %', new.subtype, new.type;
  end if;

  if new.type in ('training', 'special_event') then
    if new.scoring_format is not null
       or new.golden_point is not null
       or new.guaranteed_matches is not null then
      raise exception 'Scoring fields are not allowed for this post type';
    end if;
  end if;

  if new.scoring_format = 'other'
     and (new.rules_note is null or btrim(new.rules_note) = '') then
    raise exception 'Rules note is required when scoring format is other';
  end if;

  v_uid := auth.uid();
  if v_uid is not null and cardinality(new.rules_image_paths) > 0 then
    v_prefix := v_uid::text || '/';
    foreach v_path in array new.rules_image_paths loop
      if v_path is null or v_path !~ ('^' || v_prefix) then
        raise exception 'Invalid rules image path for author';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create trigger trg_validate_community_post_shape
  before insert or update on public.community_posts
  for each row execute function public.validate_community_post_shape();

revoke all on function public.community_post_subtype_allowed(
  public.community_post_type,
  public.community_post_subtype
) from public, anon;
grant execute on function public.community_post_subtype_allowed(
  public.community_post_type,
  public.community_post_subtype
) to authenticated;
