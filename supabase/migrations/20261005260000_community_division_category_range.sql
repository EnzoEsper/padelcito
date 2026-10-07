-- Align division category columns with matches convention: category_max = stronger (lower number).

alter table public.community_post_divisions
  drop constraint if exists community_post_divisions_category_min_category_max_check;

alter table public.community_post_divisions
  add constraint community_post_divisions_category_band
    check (
      category_min is null
      or category_max is null
      or category_max <= category_min
    );

comment on column public.community_post_divisions.category_max is
  'Strongest accepted category (lower number = stronger), same as matches.category_max.';
comment on column public.community_post_divisions.category_min is
  'Weakest accepted category (higher number = weaker), same as matches.category_min.';
