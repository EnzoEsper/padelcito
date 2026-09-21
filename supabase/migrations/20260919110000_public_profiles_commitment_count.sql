-- Expose commitment_count on public_profiles for reliability progress copy.

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
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Public read surface for other users. Includes commitment_count for reliability sample progress.';
