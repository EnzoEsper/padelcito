-- Community event taxonomy: extend post type and add supporting enums.
-- Enum values must be committed before use in a follow-up migration.

alter type public.community_post_type add value if not exists 'social';
alter type public.community_post_type add value if not exists 'league';
alter type public.community_post_type add value if not exists 'special_event';

create type public.community_post_subtype as enum (
  'elimination',
  'groups_knockout',
  'round_robin',
  'americano',
  'teams',
  'mexicano',
  'pozo',
  'mixer',
  'pairs',
  'ladder',
  'clinic',
  'group_class',
  'camp',
  'coach_course',
  'exhibition',
  'festival',
  'corporate',
  'other'
);

create type public.community_post_tag as enum (
  'welcome_kit',
  'tshirt',
  'new_balls',
  'hydration',
  'fruit_snacks',
  'food',
  'drinks',
  'physio',
  'photographer',
  'streaming',
  'referee',
  'buffet',
  'indoor_courts',
  'cash_prizes',
  'product_prizes',
  'trophies',
  'raffles',
  'ranking_points',
  'third_time',
  'music_dj',
  'night',
  'networking',
  'charity',
  'express',
  'beginner_friendly',
  'featured_pros',
  'sponsors'
);

create type public.community_post_scoring_format as enum (
  'best_of_3_sets',
  'two_sets_super_tiebreak',
  'one_set_6',
  'one_set_9',
  'timed_or_points',
  'other'
);

create type public.community_post_fee_unit as enum (
  'per_player',
  'per_pair',
  'per_team'
);

create type public.community_post_division_gender as enum (
  'male',
  'female',
  'mixed',
  'open'
);
