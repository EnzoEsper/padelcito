-- Sum is a per-category band, not a tournament format in create-post UI.

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
      'traditional', 'teams', 'americano', 'other'
    )
    when 'social' then p_subtype in ('americano', 'mexicano', 'pozo', 'mixer', 'other')
    when 'league' then p_subtype in ('pairs', 'teams', 'ladder', 'other')
    when 'training' then p_subtype in ('clinic', 'group_class', 'camp', 'coach_course', 'other')
    when 'special_event' then p_subtype in ('exhibition', 'festival', 'corporate', 'other')
    else false
  end;
$$;

update public.community_posts
set
  subtype = 'traditional',
  subtype_note = null
where type = 'tournament' and subtype = 'suma';

create or replace function public.set_community_post_divisions(
  p_post_id uuid,
  p_divisions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.community_posts%rowtype;
  v_count integer;
  v_row jsonb;
  v_pos integer;
  v_gender public.community_post_division_gender;
  v_cat_min smallint;
  v_cat_max smallint;
  v_cat_sum smallint;
  v_age_min smallint;
  v_age_max smallint;
  v_label text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_post from public.community_posts where id = p_post_id;
  if not found then
    raise exception 'Community post not found';
  end if;

  if v_post.author_id <> auth.uid() and not public.is_moderator() then
    raise exception 'Only the author or a moderator can update divisions';
  end if;

  if not public.is_moderator()
     and v_post.status not in ('pending_review', 'rejected') then
    raise exception 'Divisions can only be edited while post is pending or rejected';
  end if;

  if p_divisions is null then
    p_divisions := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_divisions) <> 'array' then
    raise exception 'Divisions payload must be a JSON array';
  end if;

  v_count := jsonb_array_length(p_divisions);
  if v_count > 12 then
    raise exception 'At most 12 divisions allowed';
  end if;

  if v_post.type in ('tournament', 'league') and v_count < 1 then
    raise exception 'At least one category is required for this event type';
  end if;

  delete from public.community_post_divisions where post_id = p_post_id;

  for v_pos in 0..(v_count - 1) loop
    v_row := p_divisions -> v_pos;

    v_gender := (v_row ->> 'gender')::public.community_post_division_gender;
    if v_gender is null then
      raise exception 'Division gender is required';
    end if;

    v_cat_min := nullif(v_row ->> 'category_min', '')::smallint;
    v_cat_max := nullif(v_row ->> 'category_max', '')::smallint;
    v_cat_sum := nullif(v_row ->> 'category_sum', '')::smallint;
    v_age_min := nullif(v_row ->> 'age_min', '')::smallint;
    v_age_max := nullif(v_row ->> 'age_max', '')::smallint;
    v_label := nullif(btrim(v_row ->> 'label'), '');

    if v_cat_sum is not null and (v_cat_min is not null or v_cat_max is not null) then
      raise exception 'Use category range or sum, not both';
    end if;

    if v_cat_min is not null and v_cat_max is not null and v_cat_max > v_cat_min then
      raise exception 'Invalid category range';
    end if;

    if v_age_min is not null and v_age_max is not null and v_age_min > v_age_max then
      raise exception 'Invalid age range';
    end if;

    insert into public.community_post_divisions (
      post_id,
      position,
      gender,
      category_min,
      category_max,
      category_sum,
      age_min,
      age_max,
      label
    ) values (
      p_post_id,
      v_pos,
      v_gender,
      v_cat_min,
      v_cat_max,
      v_cat_sum,
      v_age_min,
      v_age_max,
      v_label
    );
  end loop;
end;
$$;
