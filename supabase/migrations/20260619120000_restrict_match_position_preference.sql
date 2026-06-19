-- Replace positions_sought text[] with a single match_position_preference enum (any | drive | backhand).

create type public.match_position_preference as enum ('any', 'drive', 'backhand');

alter table public.matches
  add column position_preference public.match_position_preference not null default 'any';

update public.matches
set position_preference = case
  when cardinality(positions_sought) = 0 then 'any'::public.match_position_preference
  when positions_sought[1] = 'drive' then 'drive'::public.match_position_preference
  when positions_sought[1] = 'backhand' then 'backhand'::public.match_position_preference
  else 'any'::public.match_position_preference
end;

alter table public.matches
  drop column positions_sought;

comment on column public.matches.position_preference is
  'Side preference for open spots: any = no restriction; drive or backhand = specific court side sought.';
