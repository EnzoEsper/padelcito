-- Remove legacy inverted range check (category_min <= category_max).
-- Correct convention is community_post_divisions_category_band (category_max <= category_min).

alter table public.community_post_divisions
  drop constraint if exists community_post_divisions_check1;
