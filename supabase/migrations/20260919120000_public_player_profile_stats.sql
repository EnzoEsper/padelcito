-- Aggregated public stats for player profiles (finished matches, tag highlights, mutual count).

create or replace function public.public_player_profile_stats(p_profile_id uuid)
returns table (
  matches_finished_count integer,
  mutual_finished_count integer,
  quality_tag_counts jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid;
begin
  if p_profile_id is null then
    return;
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_profile_id
  ) then
    return;
  end if;

  v_viewer_id := auth.uid();

  return query
  select
    (
      (
        select count(*)::integer
        from public.matches m
        where m.host_id = p_profile_id
          and m.status = 'finished'
          and public.match_accepted_count(m.id) >= 1
      )
      + (
        select count(*)::integer
        from public.match_participants mp
        inner join public.matches m on m.id = mp.match_id
        where mp.profile_id = p_profile_id
          and mp.status = 'accepted'
          and m.status = 'finished'
      )
    ) as matches_finished_count,
    case
      when v_viewer_id is null or v_viewer_id = p_profile_id then 0
      else (
        select count(distinct m.id)::integer
        from public.matches m
        where m.status = 'finished'
          and public.profile_finished_match(p_profile_id, m.id)
          and public.profile_finished_match(v_viewer_id, m.id)
      )
    end as mutual_finished_count,
    coalesce(
      (
        select jsonb_object_agg(tag, tag_count)
        from (
          select t.tag, count(*)::integer as tag_count
          from public.ratings r
          cross join lateral unnest(r.tags) as t(tag)
          where r.ratee_id = p_profile_id
            and r.context = 'standard'
            and cardinality(r.tags) > 0
          group by t.tag
          order by tag_count desc, t.tag asc
          limit 5
        ) ranked
      ),
      '{}'::jsonb
    ) as quality_tag_counts;
end;
$$;

comment on function public.public_player_profile_stats(uuid) is
  'Public aggregate stats for a player profile: finished match count, mutual finished count with viewer, top quality rating tags.';

revoke all on function public.public_player_profile_stats(uuid) from public, anon;
grant execute on function public.public_player_profile_stats(uuid) to authenticated;

-- Helper: whether profile participated in a finished match (host with accepted players, or accepted participant).
create or replace function public.profile_finished_match(p_profile_id uuid, p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and m.status = 'finished'
      and (
        (m.host_id = p_profile_id and public.match_accepted_count(m.id) >= 1)
        or exists (
          select 1
          from public.match_participants mp
          where mp.match_id = m.id
            and mp.profile_id = p_profile_id
            and mp.status = 'accepted'
        )
      )
  );
$$;

revoke all on function public.profile_finished_match(uuid, uuid) from public, anon;
grant execute on function public.profile_finished_match(uuid, uuid) to authenticated;
