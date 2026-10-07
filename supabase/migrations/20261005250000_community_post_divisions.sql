-- Divisions per community post; writes via RPC only.

create table public.community_post_divisions (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.community_posts (id) on delete cascade,
  position      smallint not null check (position between 0 and 11),
  gender        public.community_post_division_gender not null,
  category_min  smallint check (category_min is null or category_min between 1 and 9),
  category_max  smallint check (category_max is null or category_max between 1 and 9),
  category_sum  smallint check (category_sum is null or category_sum between 2 and 18),
  age_min       smallint check (age_min is null or age_min between 1 and 99),
  age_max       smallint check (age_max is null or age_max between 1 and 99),
  label         text check (label is null or char_length(label) between 1 and 40),
  unique (post_id, position),
  check (
    category_sum is null
    or (category_min is null and category_max is null)
  ),
  check (
    category_min is null
    or category_max is null
    or category_max <= category_min
  ),
  check (
    age_min is null
    or age_max is null
    or age_min <= age_max
  )
);

create index idx_community_post_divisions_post_id
  on public.community_post_divisions (post_id);

comment on table public.community_post_divisions is
  'Competitive divisions advertised on a community post (0–12 rows).';

create or replace function public.can_view_community_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_posts f
    where f.id = p_post_id
      and (
        f.status = 'approved'
        or f.author_id = (select auth.uid())
        or public.is_moderator()
      )
  );
$$;

revoke all on function public.can_view_community_post(uuid) from public, anon;
grant execute on function public.can_view_community_post(uuid) to anon, authenticated;

alter table public.community_post_divisions enable row level security;

revoke all on public.community_post_divisions from anon, authenticated;
grant select on public.community_post_divisions to anon, authenticated;

create policy "Divisions visible with parent post"
  on public.community_post_divisions for select
  to anon, authenticated
  using (public.can_view_community_post(post_id));

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

grant execute on function public.set_community_post_divisions(uuid, jsonb) to authenticated;
