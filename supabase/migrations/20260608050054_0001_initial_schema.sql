-- ============================================================================
-- SPORTS MATCHMAKING & TOURNAMENT PLATFORM — COMPLETE SUPABASE SCHEMA
-- ============================================================================
-- Target: PostgreSQL 15+ on Supabase (PostGIS + Realtime + RLS + Storage)
-- Apply as a single migration:
--   supabase migration new initial_schema
--   (paste this file into the generated migration, then `supabase db reset`)
--
-- Design principles:
--   * Every table has RLS enabled with explicit policies (anon / authenticated
--     / owner). No table is left open.
--   * All cross-table RLS checks go through SECURITY DEFINER helper functions
--     to prevent recursive-policy errors and keep policies readable.
--   * Sensitive data (whatsapp_phone) is NEVER exposed through table RLS;
--     it is only reachable through the match_contact_details() RPC.
--   * State machines are enforced by triggers (capacity, late-withdrawal
--     penalty flags, bracket advancement, standings recomputation).
--   * Volatile business config (scoring rules, circuit points) lives in jsonb
--     so product pivots do not require schema migrations.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

create type public.skill_level as enum (
  'beginner', 'intermediate', 'advanced', 'expert', 'pro'
);

create type public.match_status as enum (
  'open', 'full', 'in_progress', 'completed', 'cancelled'
);

create type public.participant_status as enum (
  'pending', 'accepted', 'rejected', 'withdrawn', 'removed'
);

create type public.rating_context as enum (
  'standard',        -- normal post-match mutual rating
  'late_withdrawal', -- participant abandoned within the penalty window
  'host_removal'     -- host removed an accepted participant within the window
);

create type public.listing_type as enum (
  'training_partner', 'team_search', 'coaching_offer'
);

create type public.listing_status as enum (
  'open', 'closed', 'archived'
);

create type public.response_status as enum (
  'pending', 'accepted', 'declined'
);

create type public.tournament_status as enum (
  'draft', 'registration_open', 'registration_closed',
  'in_progress', 'completed', 'cancelled'
);

create type public.tournament_format as enum (
  'single_elimination', 'round_robin', 'group_stage_knockout'
);

create type public.registration_status as enum (
  'pending', 'approved', 'rejected', 'withdrawn'
);

create type public.payment_status as enum (
  'not_required',   -- free tournament
  'pending_proof',  -- fee required, receipt not yet uploaded
  'under_review',   -- receipt uploaded, organizer has not verified it
  'verified',       -- organizer confirmed the payment
  'rejected'        -- organizer rejected the proof
);

create type public.tournament_match_status as enum (
  'scheduled', 'on_court', 'completed', 'walkover', 'cancelled'
);

create type public.conversation_type as enum (
  'match', 'direct', 'tournament'
);

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 sports — multi-sport catalog (seeded, managed via migrations)
-- ---------------------------------------------------------------------------
create table public.sports (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  name                   text not null,
  players_per_side       smallint not null default 1 check (players_per_side between 1 and 30),
  min_players            smallint not null default 2 check (min_players >= 2),
  default_scoring_config jsonb not null default '{}'::jsonb,
  icon                   text,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now()
);

comment on table public.sports is
  'Reference catalog of supported sports. default_scoring_config seeds tournaments.scoring_config.';

-- ---------------------------------------------------------------------------
-- 2.2 profiles — 1:1 with auth.users, created automatically by trigger
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        extensions.citext unique
                  check (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  display_name    text not null default 'Player',
  avatar_url      text,
  bio             text check (char_length(bio) <= 500),
  whatsapp_phone  text check (whatsapp_phone ~ '^\+[1-9][0-9]{6,14}$'), -- E.164
  home_location   extensions.geography(point, 4326),
  search_radius_m integer not null default 10000 check (search_radius_m between 500 and 200000),
  rating_avg      numeric(3,2) check (rating_avg between 1.00 and 5.00),
  rating_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column public.profiles.whatsapp_phone is
  'E.164 phone. NEVER exposed via RLS to other users — only through match_contact_details() RPC.';
comment on column public.profiles.rating_avg is
  'Denormalized aggregate maintained by trg_apply_rating_to_profile.';

-- ---------------------------------------------------------------------------
-- 2.3 profile_sports — per-sport skill profile (junction)
-- ---------------------------------------------------------------------------
create table public.profile_sports (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  sport_id      uuid not null references public.sports (id) on delete cascade,
  skill_level   public.skill_level not null default 'beginner',
  years_playing smallint check (years_playing between 0 and 80),
  notes         text check (char_length(notes) <= 280),
  created_at    timestamptz not null default now(),
  unique (profile_id, sport_id)
);

-- ---------------------------------------------------------------------------
-- 2.4 matches — core matchmaking unit (hosted pickup games)
-- ---------------------------------------------------------------------------
create table public.matches (
  id                         uuid primary key default gen_random_uuid(),
  host_id                    uuid not null references public.profiles (id) on delete cascade,
  sport_id                   uuid not null references public.sports (id) on delete restrict,
  title                      text not null check (char_length(title) between 3 and 120),
  description                text check (char_length(description) <= 2000),
  venue_name                 text,
  location                   extensions.geography(point, 4326) not null,
  starts_at                  timestamptz not null,
  duration_minutes           smallint not null default 90 check (duration_minutes between 15 and 480),
  capacity                   smallint not null check (capacity between 2 and 60), -- total players incl. host
  skill_min                  public.skill_level,
  skill_max                  public.skill_level,
  status                     public.match_status not null default 'open',
  is_public                  boolean not null default true,
  late_withdrawal_threshold  interval not null default interval '2 hours',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

comment on column public.matches.late_withdrawal_threshold is
  'Withdrawals/removals at or after (starts_at - threshold) raise penalty flags on the participant row.';

-- ---------------------------------------------------------------------------
-- 2.5 match_participants — join requests + acceptance state machine
-- ---------------------------------------------------------------------------
create table public.match_participants (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null references public.matches (id) on delete cascade,
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  status              public.participant_status not null default 'pending',
  message             text check (char_length(message) <= 500),
  requested_at        timestamptz not null default now(),
  responded_at        timestamptz,
  left_at             timestamptz,
  was_late_withdrawal boolean not null default false, -- unlocks 'late_withdrawal' rating against this participant
  was_removed_by_host boolean not null default false, -- unlocks 'host_removal' rating against the host
  unique (match_id, profile_id)
);

comment on column public.match_participants.was_late_withdrawal is
  'Set by trigger when an accepted participant withdraws within the penalty window. Enables context-flagged penalty rating without admin moderation.';

-- ---------------------------------------------------------------------------
-- 2.6 ratings — mutual post-match ratings + automated penalty contexts
-- ---------------------------------------------------------------------------
create table public.ratings (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  rater_id   uuid not null references public.profiles (id) on delete cascade,
  ratee_id   uuid not null references public.profiles (id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  tags       text[] not null default '{}',
  context    public.rating_context not null default 'standard',
  comment    text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (match_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);

comment on table public.ratings is
  'Validity of (context, rater, ratee, match-state) combinations is enforced by trg_validate_rating.';

-- ---------------------------------------------------------------------------
-- 2.7 listings — open-ended, non-expiring posts (partners / teams / coaching)
-- ---------------------------------------------------------------------------
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  sport_id    uuid not null references public.sports (id) on delete restrict,
  type        public.listing_type not null,
  title       text not null check (char_length(title) between 3 and 120),
  body        text not null check (char_length(body) <= 4000),
  location    extensions.geography(point, 4326),
  venue_name  text,
  details     jsonb not null default '{}'::jsonb, -- e.g. coaching package: price, schedule, group size
  status      public.listing_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz
);

comment on table public.listings is
  'Deliberately has NO expiry column: listings stay open until the creator closes or archives them.';

-- ---------------------------------------------------------------------------
-- 2.8 listing_responses — replies to listings
-- ---------------------------------------------------------------------------
create table public.listing_responses (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  message      text not null check (char_length(message) <= 1000),
  status       public.response_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (listing_id, responder_id)
);

-- ---------------------------------------------------------------------------
-- 2.9 circuits — multi-tournament competitive series
-- ---------------------------------------------------------------------------
create table public.circuits (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references public.profiles (id) on delete cascade,
  sport_id      uuid not null references public.sports (id) on delete restrict,
  name          text not null check (char_length(name) between 3 and 120),
  description   text check (char_length(description) <= 2000),
  season        text, -- e.g. '2026'
  points_config jsonb not null default '{"champion": 100, "finalist": 60, "semifinalist": 35, "quarterfinalist": 20, "participant": 10}'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2.10 tournaments — official events AND user-driven local mini-tournaments
-- ---------------------------------------------------------------------------
create table public.tournaments (
  id                     uuid primary key default gen_random_uuid(),
  circuit_id             uuid references public.circuits (id) on delete set null,
  organizer_id           uuid not null references public.profiles (id) on delete cascade,
  sport_id               uuid not null references public.sports (id) on delete restrict,
  source_match_id        uuid references public.matches (id) on delete set null, -- spawned from a matchmaking group
  name                   text not null check (char_length(name) between 3 and 120),
  description            text check (char_length(description) <= 4000),
  format                 public.tournament_format not null,
  status                 public.tournament_status not null default 'draft',
  is_local               boolean not null default false, -- "on-the-fly" mini-tournament between friends
  venue_name             text,
  location               extensions.geography(point, 4326),
  starts_at              timestamptz,
  registration_opens_at  timestamptz,
  registration_closes_at timestamptz,
  max_registrations      smallint check (max_registrations between 2 and 512),
  entry_fee              numeric(12,2) not null default 0 check (entry_fee >= 0),
  currency               char(3) not null default 'ARS',
  scoring_config         jsonb not null default '{"sets_to_win": 2, "games_per_set": 6, "tie_break": true, "tie_break_points": 7}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (registration_closes_at is null or registration_opens_at is null
         or registration_closes_at > registration_opens_at)
);

comment on column public.tournaments.is_local is
  'true = user-driven on-the-fly tournament: custom scoring_config, quick brackets, participants may report scores.';
comment on column public.tournaments.scoring_config is
  'Custom scoring rules (sets, games, tie-breaks). jsonb by design so rule variations never require migrations.';

-- ---------------------------------------------------------------------------
-- 2.11 tournament_courts — physical courts available for live assignment
-- ---------------------------------------------------------------------------
create table public.tournament_courts (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  label         text not null check (char_length(label) between 1 and 60),
  sort_order    smallint not null default 0,
  unique (tournament_id, label)
);

-- ---------------------------------------------------------------------------
-- 2.12 tournament_registrations — sign-ups + manual payment proof review
-- ---------------------------------------------------------------------------
create table public.tournament_registrations (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references public.tournaments (id) on delete cascade,
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  team_name           text check (char_length(team_name) <= 80),
  partner_name        text check (char_length(partner_name) <= 80), -- doubles partner (may not be a platform user)
  status              public.registration_status not null default 'pending',
  payment_status      public.payment_status not null default 'not_required',
  receipt_storage_path text, -- Supabase Storage path in 'receipts' bucket: {registration_id}/{filename}
  payment_reviewed_by uuid references public.profiles (id) on delete set null,
  payment_reviewed_at timestamptz,
  seed                smallint check (seed between 1 and 512),
  registered_at       timestamptz not null default now(),
  unique (tournament_id, profile_id)
);

comment on column public.tournament_registrations.receipt_storage_path is
  'Digital payment proof. Bucket policies allow upload by the registrant and read by registrant + organizer only.';

-- ---------------------------------------------------------------------------
-- 2.13 tournament_stages — supports chained formats (groups -> knockout)
-- ---------------------------------------------------------------------------
create table public.tournament_stages (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  stage_number  smallint not null check (stage_number >= 1),
  name          text not null default 'Main Draw',
  format        public.tournament_format not null,
  created_at    timestamptz not null default now(),
  unique (tournament_id, stage_number)
);

-- ---------------------------------------------------------------------------
-- 2.14 tournament_matches — bracket cells with live scores + court assignment
-- ---------------------------------------------------------------------------
create table public.tournament_matches (
  id                     uuid primary key default gen_random_uuid(),
  stage_id               uuid not null references public.tournament_stages (id) on delete cascade,
  round_number           smallint not null check (round_number >= 1),
  bracket_position       smallint not null check (bracket_position >= 1),
  court_id               uuid references public.tournament_courts (id) on delete set null,
  side_a_registration_id uuid references public.tournament_registrations (id) on delete set null,
  side_b_registration_id uuid references public.tournament_registrations (id) on delete set null,
  status                 public.tournament_match_status not null default 'scheduled',
  score                  jsonb not null default '[]'::jsonb, -- [{"a": 6, "b": 4}, {"a": 7, "b": 6}] set by set
  winner_side            smallint check (winner_side in (1, 2)),
  next_match_id          uuid references public.tournament_matches (id) on delete set null,
  next_match_slot        smallint check (next_match_slot in (1, 2)),
  scheduled_at           timestamptz,
  started_at             timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (stage_id, round_number, bracket_position)
);

comment on column public.tournament_matches.score is
  'Set-by-set live score: [{"a": <side_a games>, "b": <side_b games>}, ...]. Streamed via Realtime.';
comment on column public.tournament_matches.next_match_id is
  'Single-elimination progression: winner is propagated into next_match_id at next_match_slot by trigger.';

-- ---------------------------------------------------------------------------
-- 2.15 tournament_standings — automated leaderboard per stage
-- ---------------------------------------------------------------------------
create table public.tournament_standings (
  id              uuid primary key default gen_random_uuid(),
  stage_id        uuid not null references public.tournament_stages (id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations (id) on delete cascade,
  matches_played  smallint not null default 0,
  matches_won     smallint not null default 0,
  matches_lost    smallint not null default 0,
  sets_won        smallint not null default 0,
  sets_lost       smallint not null default 0,
  games_won       smallint not null default 0,
  games_lost      smallint not null default 0,
  points          smallint not null default 0,
  rank            smallint,
  updated_at      timestamptz not null default now(),
  unique (stage_id, registration_id)
);

comment on table public.tournament_standings is
  'Fully recomputed by recompute_stage_standings() whenever a tournament match completes. Read-only for clients.';

-- ---------------------------------------------------------------------------
-- 2.16 circuit_standings — aggregated ranking across a circuit
-- ---------------------------------------------------------------------------
create table public.circuit_standings (
  id                 uuid primary key default gen_random_uuid(),
  circuit_id         uuid not null references public.circuits (id) on delete cascade,
  profile_id         uuid not null references public.profiles (id) on delete cascade,
  points             integer not null default 0,
  tournaments_played smallint not null default 0,
  rank               smallint,
  updated_at         timestamptz not null default now(),
  unique (circuit_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- 2.17 conversations / members / messages — in-app chat (MVP-dormant)
-- ---------------------------------------------------------------------------
-- The MVP uses WhatsApp deep links; these tables exist so chat ships later
-- with zero schema migration. RLS is already production-grade.
create table public.conversations (
  id            uuid primary key default gen_random_uuid(),
  type          public.conversation_type not null,
  match_id      uuid references public.matches (id) on delete set null,
  tournament_id uuid references public.tournaments (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null,
  title         text check (char_length(title) <= 120),
  created_at    timestamptz not null default now()
);

create table public.conversation_members (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  unique (conversation_id, profile_id)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid references public.profiles (id) on delete set null,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 3. PUBLIC PROFILE VIEW (safe column projection)
-- ============================================================================
-- profiles RLS only allows reading YOUR OWN row (it contains whatsapp_phone).
-- Everyone else reads through this view, which exposes only safe columns.
-- security_invoker = off is intentional: the view owner bypasses profiles RLS
-- but the projection itself is the security boundary.

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
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ============================================================================
-- 4. RLS HELPER FUNCTIONS (SECURITY DEFINER — break policy recursion)
-- ============================================================================

create or replace function public.is_match_host(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from matches m
    where m.id = p_match_id and m.host_id = auth.uid()
  );
$$;

create or replace function public.is_match_member(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from matches m
    where m.id = p_match_id and m.host_id = auth.uid()
  ) or exists (
    select 1 from match_participants mp
    where mp.match_id = p_match_id
      and mp.profile_id = auth.uid()
      and mp.status = 'accepted'
  );
$$;

create or replace function public.has_match_relationship(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from matches m
    where m.id = p_match_id and m.host_id = auth.uid()
  ) or exists (
    select 1 from match_participants mp
    where mp.match_id = p_match_id and mp.profile_id = auth.uid()
  );
$$;

create or replace function public.is_match_open(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from matches m
    where m.id = p_match_id and m.status = 'open' and m.starts_at > now()
  );
$$;

-- Internal variant used by the rating-validation trigger (explicit profile).
create or replace function public.is_match_member_of(p_match_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from matches m
    where m.id = p_match_id and m.host_id = p_profile_id
  ) or exists (
    select 1 from match_participants mp
    where mp.match_id = p_match_id
      and mp.profile_id = p_profile_id
      and mp.status = 'accepted'
  );
$$;

create or replace function public.is_listing_owner(p_listing_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from listings l
    where l.id = p_listing_id and l.creator_id = auth.uid()
  );
$$;

create or replace function public.is_listing_open(p_listing_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from listings l
    where l.id = p_listing_id and l.status = 'open'
  );
$$;

create or replace function public.is_tournament_organizer(p_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from tournaments t
    where t.id = p_tournament_id and t.organizer_id = auth.uid()
  );
$$;

create or replace function public.is_tournament_visible(p_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from tournaments t
    where t.id = p_tournament_id
      and (t.status <> 'draft' or t.organizer_id = auth.uid())
  );
$$;

create or replace function public.is_registration_open(p_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from tournaments t
    where t.id = p_tournament_id
      and t.status = 'registration_open'
      and (t.registration_closes_at is null or now() <= t.registration_closes_at)
      and (t.max_registrations is null or (
        select count(*) from tournament_registrations tr
        where tr.tournament_id = t.id and tr.status in ('pending', 'approved')
      ) < t.max_registrations)
  );
$$;

create or replace function public.is_stage_organizer(p_stage_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from tournament_stages s
    join tournaments t on t.id = s.tournament_id
    where s.id = p_stage_id and t.organizer_id = auth.uid()
  );
$$;

create or replace function public.is_stage_visible(p_stage_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from tournament_stages s
    join tournaments t on t.id = s.tournament_id
    where s.id = p_stage_id
      and (t.status <> 'draft' or t.organizer_id = auth.uid())
  );
$$;

-- Local (on-the-fly) tournaments let any approved participant report scores.
create or replace function public.can_report_score(p_tournament_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from tournament_matches tm
    join tournament_stages s on s.id = tm.stage_id
    join tournaments t on t.id = s.tournament_id
    where tm.id = p_tournament_match_id
      and (
        t.organizer_id = auth.uid()
        or (t.is_local and exists (
          select 1 from tournament_registrations tr
          where tr.tournament_id = t.id
            and tr.profile_id = auth.uid()
            and tr.status = 'approved'
        ))
      )
  );
$$;

create or replace function public.is_circuit_organizer(p_circuit_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from circuits c
    where c.id = p_circuit_id and c.organizer_id = auth.uid()
  );
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.profile_id = auth.uid()
  );
$$;

create or replace function public.is_conversation_creator(p_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from conversations c
    where c.id = p_conversation_id and c.created_by = auth.uid()
  );
$$;

-- ============================================================================
-- 5. TRIGGER FUNCTIONS & TRIGGERS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 Profile auto-creation on signup (Supabase Auth sync)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Player'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5.2 Generic updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

create trigger trg_listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger trg_circuits_updated_at
  before update on public.circuits
  for each row execute function public.set_updated_at();

create trigger trg_tournaments_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();

create trigger trg_tournament_matches_updated_at
  before update on public.tournament_matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5.3 Participant state machine: capacity enforcement + penalty flags
-- ---------------------------------------------------------------------------
create or replace function public.handle_participant_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_accepted integer;
begin
  select * into v_match
  from public.matches
  where id = new.match_id
  for update; -- serialize concurrent acceptances against the same match

  -- pending -> accepted: enforce capacity, flip match to 'full' when it fills
  if old.status = 'pending' and new.status = 'accepted' then
    select count(*) into v_accepted
    from public.match_participants
    where match_id = new.match_id
      and status = 'accepted'
      and id <> new.id;

    -- +1 for this participant, +1 for the host
    if v_accepted + 2 > v_match.capacity then
      raise exception 'Match % is already at full capacity (% players)',
        new.match_id, v_match.capacity;
    end if;

    new.responded_at := now();

    if v_accepted + 2 = v_match.capacity then
      update public.matches
      set status = 'full'
      where id = new.match_id and status = 'open';
    end if;

  -- pending -> rejected: stamp response time
  elsif old.status = 'pending' and new.status = 'rejected' then
    new.responded_at := now();

  -- accepted -> withdrawn/removed: penalty window + seat reopening
  elsif old.status = 'accepted' and new.status in ('withdrawn', 'removed') then
    new.left_at := now();

    if v_match.status in ('open', 'full')
       and now() >= v_match.starts_at - v_match.late_withdrawal_threshold then
      if new.status = 'withdrawn' then
        new.was_late_withdrawal := true;  -- participant abandoned late -> penalizable
      else
        new.was_removed_by_host := true;  -- host removed late -> host penalizable
      end if;
    end if;

    -- a seat opened up again
    update public.matches
    set status = 'open'
    where id = new.match_id
      and status = 'full'
      and starts_at > now();
  end if;

  return new;
end;
$$;

create trigger trg_participant_status_change
  before update of status on public.match_participants
  for each row
  when (old.status is distinct from new.status)
  execute function public.handle_participant_status_change();

-- ---------------------------------------------------------------------------
-- 5.4 Rating validation — enforces who may rate whom, in which context
-- ---------------------------------------------------------------------------
create or replace function public.validate_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id = new.match_id;
  if not found then
    raise exception 'Match % does not exist', new.match_id;
  end if;

  if new.context = 'standard' then
    if v_match.status <> 'completed' then
      raise exception 'Standard ratings are only allowed after the match is completed';
    end if;
    if not public.is_match_member_of(new.match_id, new.rater_id)
       or not public.is_match_member_of(new.match_id, new.ratee_id) then
      raise exception 'Standard ratings require both rater and ratee to be match members';
    end if;

  elsif new.context = 'late_withdrawal' then
    -- ratee must carry the automated penalty flag; any member may penalize
    if not exists (
      select 1 from public.match_participants mp
      where mp.match_id = new.match_id
        and mp.profile_id = new.ratee_id
        and mp.was_late_withdrawal
    ) then
      raise exception 'late_withdrawal ratings require the ratee to have a late-withdrawal flag on this match';
    end if;
    if not public.is_match_member_of(new.match_id, new.rater_id)
       and new.rater_id <> v_match.host_id then
      raise exception 'Only match members can submit late_withdrawal ratings';
    end if;

  elsif new.context = 'host_removal' then
    -- only a participant who was removed late may penalize the host
    if new.ratee_id <> v_match.host_id then
      raise exception 'host_removal ratings must target the match host';
    end if;
    if not exists (
      select 1 from public.match_participants mp
      where mp.match_id = new.match_id
        and mp.profile_id = new.rater_id
        and mp.was_removed_by_host
    ) then
      raise exception 'host_removal ratings require the rater to have been removed within the penalty window';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validate_rating
  before insert on public.ratings
  for each row execute function public.validate_rating();

-- ---------------------------------------------------------------------------
-- 5.5 Rating aggregates on profiles
-- ---------------------------------------------------------------------------
create or replace function public.apply_rating_to_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_ratee uuid := coalesce(new.ratee_id, old.ratee_id);
begin
  update public.profiles p
  set rating_avg   = sub.avg_stars,
      rating_count = sub.cnt
  from (
    select round(avg(stars)::numeric, 2) as avg_stars, count(*) as cnt
    from public.ratings
    where ratee_id = v_ratee
  ) sub
  where p.id = v_ratee;
  return coalesce(new, old);
end;
$$;

create trigger trg_apply_rating_to_profile
  after insert or update or delete on public.ratings
  for each row execute function public.apply_rating_to_profile();

-- ---------------------------------------------------------------------------
-- 5.6 Registration field protection (non-organizers cannot self-approve)
-- ---------------------------------------------------------------------------
create or replace function public.protect_registration_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_tournament_organizer(new.tournament_id) then
    -- registrants may withdraw and upload payment proof; nothing else
    if new.status not in ('pending', 'withdrawn') then
      raise exception 'Only the tournament organizer can set registration status to %', new.status;
    end if;
    if new.payment_status not in ('not_required', 'pending_proof', 'under_review') then
      raise exception 'Only the tournament organizer can set payment status to %', new.payment_status;
    end if;
    new.seed                := old.seed;
    new.payment_reviewed_by := old.payment_reviewed_by;
    new.payment_reviewed_at := old.payment_reviewed_at;
  elsif new.payment_status is distinct from old.payment_status
        and new.payment_status in ('verified', 'rejected') then
    new.payment_reviewed_by := auth.uid();
    new.payment_reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_protect_registration_fields
  before update on public.tournament_registrations
  for each row execute function public.protect_registration_fields();

-- ---------------------------------------------------------------------------
-- 5.7 Bracket advancement — winner flows into the next bracket cell
-- ---------------------------------------------------------------------------
create or replace function public.handle_bracket_advance()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_winner_registration uuid;
begin
  if new.next_match_id is null or new.winner_side is null then
    return new;
  end if;

  v_winner_registration := case new.winner_side
    when 1 then new.side_a_registration_id
    else new.side_b_registration_id
  end;

  if new.next_match_slot = 1 then
    update public.tournament_matches
    set side_a_registration_id = v_winner_registration
    where id = new.next_match_id;
  else
    update public.tournament_matches
    set side_b_registration_id = v_winner_registration
    where id = new.next_match_id;
  end if;

  return new;
end;
$$;

create trigger trg_bracket_advance
  after update on public.tournament_matches
  for each row
  when (new.status in ('completed', 'walkover') and new.winner_side is not null)
  execute function public.handle_bracket_advance();

-- ---------------------------------------------------------------------------
-- 5.8 Standings recomputation — automated leaderboard, zero admin screens
-- ---------------------------------------------------------------------------
create or replace function public.recompute_stage_standings(p_stage_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.tournament_standings where stage_id = p_stage_id;

  insert into public.tournament_standings (
    stage_id, registration_id,
    matches_played, matches_won, matches_lost,
    sets_won, sets_lost, games_won, games_lost,
    points, rank, updated_at
  )
  with sides as (
    select tm.id as match_id, tm.winner_side, tm.score,
           tm.side_a_registration_id as reg_id, 1 as side
    from public.tournament_matches tm
    where tm.stage_id = p_stage_id
      and tm.status in ('completed', 'walkover')
      and tm.side_a_registration_id is not null
    union all
    select tm.id, tm.winner_side, tm.score,
           tm.side_b_registration_id, 2
    from public.tournament_matches tm
    where tm.stage_id = p_stage_id
      and tm.status in ('completed', 'walkover')
      and tm.side_b_registration_id is not null
  ),
  set_lines as (
    select s.match_id, s.reg_id, s.side, s.winner_side,
           coalesce((st.value ->> 'a')::int, 0) as a_games,
           coalesce((st.value ->> 'b')::int, 0) as b_games
    from sides s
    left join lateral jsonb_array_elements(coalesce(s.score, '[]'::jsonb)) st on true
  ),
  agg as (
    select
      reg_id,
      count(distinct match_id) as matches_played,
      count(distinct match_id) filter (where winner_side = side) as matches_won,
      count(distinct match_id) filter (where winner_side is not null and winner_side <> side) as matches_lost,
      count(*) filter (where (side = 1 and a_games > b_games) or (side = 2 and b_games > a_games)) as sets_won,
      count(*) filter (where (side = 1 and a_games < b_games) or (side = 2 and b_games < a_games)) as sets_lost,
      coalesce(sum(case when side = 1 then a_games else b_games end), 0) as games_won,
      coalesce(sum(case when side = 1 then b_games else a_games end), 0) as games_lost
    from set_lines
    group by reg_id
  )
  select
    p_stage_id, reg_id,
    matches_played, matches_won, matches_lost,
    sets_won, sets_lost, games_won, games_lost,
    matches_won * 2 + matches_lost as points, -- 2 per win, 1 per played loss
    rank() over (
      order by matches_won * 2 + matches_lost desc,
               (sets_won - sets_lost) desc,
               (games_won - games_lost) desc
    ) as computed_rank,
    now()
  from agg;
end;
$$;

create or replace function public.handle_tournament_match_completed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.recompute_stage_standings(new.stage_id);
  return new;
end;
$$;

create trigger trg_recompute_standings
  after update on public.tournament_matches
  for each row
  when (new.status in ('completed', 'walkover'))
  execute function public.handle_tournament_match_completed();

-- ============================================================================
-- 6. ROW LEVEL SECURITY — every table, explicit anon/authenticated/owner
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6.1 sports — public catalog, writes only via migrations / service_role
-- ---------------------------------------------------------------------------
alter table public.sports enable row level security;

create policy "Sports catalog is publicly readable"
  on public.sports for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 6.2 profiles — own row only (others read via public_profiles view)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No DELETE policy: profile removal cascades from auth.users deletion.

-- ---------------------------------------------------------------------------
-- 6.3 profile_sports
-- ---------------------------------------------------------------------------
alter table public.profile_sports enable row level security;

create policy "Skill profiles are publicly readable"
  on public.profile_sports for select
  to anon, authenticated
  using (true);

create policy "Users manage their own skill profiles"
  on public.profile_sports for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "Users update their own skill profiles"
  on public.profile_sports for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "Users delete their own skill profiles"
  on public.profile_sports for delete
  to authenticated
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6.4 matches
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

create policy "Public matches are visible to everyone"
  on public.matches for select
  to anon, authenticated
  using (is_public = true);

create policy "Hosts and requesters can view their matches"
  on public.matches for select
  to authenticated
  using (host_id = (select auth.uid()) or public.has_match_relationship(id));

create policy "Authenticated users can host matches"
  on public.matches for insert
  to authenticated
  with check (host_id = (select auth.uid()));

create policy "Hosts can update their matches"
  on public.matches for update
  to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy "Hosts can delete their matches"
  on public.matches for delete
  to authenticated
  using (host_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6.5 match_participants
-- ---------------------------------------------------------------------------
alter table public.match_participants enable row level security;

create policy "Participants, hosts and accepted members can view participation"
  on public.match_participants for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or public.is_match_host(match_id)
    or (status = 'accepted' and public.is_match_member(match_id))
  );

create policy "Users can request to join open matches"
  on public.match_participants for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
    and public.is_match_open(match_id)
    and not public.is_match_host(match_id)
  );

create policy "Participants can withdraw themselves"
  on public.match_participants for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and status = 'withdrawn');

create policy "Hosts can accept, reject or remove participants"
  on public.match_participants for update
  to authenticated
  using (public.is_match_host(match_id))
  with check (
    public.is_match_host(match_id)
    and status in ('accepted', 'rejected', 'removed')
  );

create policy "Requesters can cancel a pending request"
  on public.match_participants for delete
  to authenticated
  using (profile_id = (select auth.uid()) and status = 'pending');

-- ---------------------------------------------------------------------------
-- 6.6 ratings
-- ---------------------------------------------------------------------------
alter table public.ratings enable row level security;

create policy "Ratings are visible to authenticated users"
  on public.ratings for select
  to authenticated
  using (true);

create policy "Users can submit ratings as themselves"
  on public.ratings for insert
  to authenticated
  with check (rater_id = (select auth.uid())); -- contextual validity enforced by trg_validate_rating

create policy "Raters can update their own ratings"
  on public.ratings for update
  to authenticated
  using (rater_id = (select auth.uid()))
  with check (rater_id = (select auth.uid()));

create policy "Raters can delete their own ratings"
  on public.ratings for delete
  to authenticated
  using (rater_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6.7 listings
-- ---------------------------------------------------------------------------
alter table public.listings enable row level security;

create policy "Open listings are publicly readable"
  on public.listings for select
  to anon, authenticated
  using (status = 'open' or creator_id = (select auth.uid()));

create policy "Authenticated users can create listings"
  on public.listings for insert
  to authenticated
  with check (creator_id = (select auth.uid()));

create policy "Creators can update their listings"
  on public.listings for update
  to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));

create policy "Creators can delete their listings"
  on public.listings for delete
  to authenticated
  using (creator_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6.8 listing_responses
-- ---------------------------------------------------------------------------
alter table public.listing_responses enable row level security;

create policy "Responders and listing owners can view responses"
  on public.listing_responses for select
  to authenticated
  using (
    responder_id = (select auth.uid())
    or public.is_listing_owner(listing_id)
  );

create policy "Users can respond to open listings"
  on public.listing_responses for insert
  to authenticated
  with check (
    responder_id = (select auth.uid())
    and public.is_listing_open(listing_id)
    and not public.is_listing_owner(listing_id)
  );

create policy "Listing owners can accept or decline responses"
  on public.listing_responses for update
  to authenticated
  using (public.is_listing_owner(listing_id))
  with check (public.is_listing_owner(listing_id));

create policy "Responders can delete their own responses"
  on public.listing_responses for delete
  to authenticated
  using (responder_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6.9 circuits
-- ---------------------------------------------------------------------------
alter table public.circuits enable row level security;

create policy "Circuits are publicly readable"
  on public.circuits for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can create circuits"
  on public.circuits for insert
  to authenticated
  with check (organizer_id = (select auth.uid()));

create policy "Organizers can update their circuits"
  on public.circuits for update
  to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy "Organizers can delete their circuits"
  on public.circuits for delete
  to authenticated
  using (organizer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6.10 tournaments
-- ---------------------------------------------------------------------------
alter table public.tournaments enable row level security;

create policy "Published tournaments are publicly readable"
  on public.tournaments for select
  to anon, authenticated
  using (status <> 'draft' or organizer_id = (select auth.uid()));

create policy "Authenticated users can create tournaments"
  on public.tournaments for insert
  to authenticated
  with check (organizer_id = (select auth.uid()));

create policy "Organizers can update their tournaments"
  on public.tournaments for update
  to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy "Organizers can delete their tournaments"
  on public.tournaments for delete
  to authenticated
  using (organizer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6.11 tournament_courts
-- ---------------------------------------------------------------------------
alter table public.tournament_courts enable row level security;

create policy "Courts of visible tournaments are readable"
  on public.tournament_courts for select
  to anon, authenticated
  using (public.is_tournament_visible(tournament_id));

create policy "Organizers manage courts"
  on public.tournament_courts for insert
  to authenticated
  with check (public.is_tournament_organizer(tournament_id));

create policy "Organizers update courts"
  on public.tournament_courts for update
  to authenticated
  using (public.is_tournament_organizer(tournament_id))
  with check (public.is_tournament_organizer(tournament_id));

create policy "Organizers delete courts"
  on public.tournament_courts for delete
  to authenticated
  using (public.is_tournament_organizer(tournament_id));

-- ---------------------------------------------------------------------------
-- 6.12 tournament_registrations
-- ---------------------------------------------------------------------------
alter table public.tournament_registrations enable row level security;

create policy "Approved registrations of visible tournaments are readable"
  on public.tournament_registrations for select
  to anon, authenticated
  using (
    (status = 'approved' and public.is_tournament_visible(tournament_id))
    or profile_id = (select auth.uid())
    or public.is_tournament_organizer(tournament_id)
  );

create policy "Users can register while registration is open"
  on public.tournament_registrations for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
    and public.is_registration_open(tournament_id)
  );

create policy "Registrants can update their own registration"
  on public.tournament_registrations for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid())); -- field-level limits enforced by trg_protect_registration_fields

create policy "Organizers can review registrations"
  on public.tournament_registrations for update
  to authenticated
  using (public.is_tournament_organizer(tournament_id))
  with check (public.is_tournament_organizer(tournament_id));

create policy "Registrants can delete a pending registration"
  on public.tournament_registrations for delete
  to authenticated
  using (profile_id = (select auth.uid()) and status = 'pending');

-- ---------------------------------------------------------------------------
-- 6.13 tournament_stages
-- ---------------------------------------------------------------------------
alter table public.tournament_stages enable row level security;

create policy "Stages of visible tournaments are readable"
  on public.tournament_stages for select
  to anon, authenticated
  using (public.is_tournament_visible(tournament_id));

create policy "Organizers create stages"
  on public.tournament_stages for insert
  to authenticated
  with check (public.is_tournament_organizer(tournament_id));

create policy "Organizers update stages"
  on public.tournament_stages for update
  to authenticated
  using (public.is_tournament_organizer(tournament_id))
  with check (public.is_tournament_organizer(tournament_id));

create policy "Organizers delete stages"
  on public.tournament_stages for delete
  to authenticated
  using (public.is_tournament_organizer(tournament_id));

-- ---------------------------------------------------------------------------
-- 6.14 tournament_matches — live scores are public; score entry is guarded
-- ---------------------------------------------------------------------------
alter table public.tournament_matches enable row level security;

create policy "Matches of visible tournaments are readable"
  on public.tournament_matches for select
  to anon, authenticated
  using (public.is_stage_visible(stage_id));

create policy "Organizers create tournament matches"
  on public.tournament_matches for insert
  to authenticated
  with check (public.is_stage_organizer(stage_id));

create policy "Organizers and local participants can report scores"
  on public.tournament_matches for update
  to authenticated
  using (public.is_stage_organizer(stage_id) or public.can_report_score(id))
  with check (public.is_stage_organizer(stage_id) or public.can_report_score(id));

create policy "Organizers delete tournament matches"
  on public.tournament_matches for delete
  to authenticated
  using (public.is_stage_organizer(stage_id));

-- ---------------------------------------------------------------------------
-- 6.15 tournament_standings — read-only for clients (trigger-maintained)
-- ---------------------------------------------------------------------------
alter table public.tournament_standings enable row level security;

create policy "Standings of visible tournaments are readable"
  on public.tournament_standings for select
  to anon, authenticated
  using (public.is_stage_visible(stage_id));

-- No INSERT/UPDATE/DELETE policies: rows are written exclusively by
-- recompute_stage_standings() (SECURITY DEFINER, bypasses RLS).

-- ---------------------------------------------------------------------------
-- 6.16 circuit_standings
-- ---------------------------------------------------------------------------
alter table public.circuit_standings enable row level security;

create policy "Circuit standings are publicly readable"
  on public.circuit_standings for select
  to anon, authenticated
  using (true);

create policy "Circuit organizers insert standings"
  on public.circuit_standings for insert
  to authenticated
  with check (public.is_circuit_organizer(circuit_id));

create policy "Circuit organizers update standings"
  on public.circuit_standings for update
  to authenticated
  using (public.is_circuit_organizer(circuit_id))
  with check (public.is_circuit_organizer(circuit_id));

create policy "Circuit organizers delete standings"
  on public.circuit_standings for delete
  to authenticated
  using (public.is_circuit_organizer(circuit_id));

-- ---------------------------------------------------------------------------
-- 6.17 conversations / conversation_members / messages
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;

create policy "Members and creators can view conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_member(id) or created_by = (select auth.uid()));

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Creators can update conversations"
  on public.conversations for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Creators can delete conversations"
  on public.conversations for delete
  to authenticated
  using (created_by = (select auth.uid()));

alter table public.conversation_members enable row level security;

create policy "Members can view membership of their conversations"
  on public.conversation_members for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "Creators add members, users add themselves"
  on public.conversation_members for insert
  to authenticated
  with check (
    public.is_conversation_creator(conversation_id)
    or profile_id = (select auth.uid())
  );

create policy "Members update their own membership row"
  on public.conversation_members for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "Members can leave conversations"
  on public.conversation_members for delete
  to authenticated
  using (profile_id = (select auth.uid()));

alter table public.messages enable row level security;

create policy "Members can read messages"
  on public.messages for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "Members can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
  );

create policy "Senders can delete their own messages"
  on public.messages for delete
  to authenticated
  using (sender_id = (select auth.uid()));

-- ============================================================================
-- 7. INDEXES
-- ============================================================================
-- Note: UNIQUE constraints above already index their leading columns
-- (e.g. match_participants(match_id, profile_id) covers match_id lookups).

-- profiles
create index idx_profiles_home_location   on public.profiles using gist (home_location);
create index idx_profiles_username_trgm   on public.profiles using gin (username extensions.gin_trgm_ops);
create index idx_profiles_display_trgm    on public.profiles using gin (display_name extensions.gin_trgm_ops);

-- profile_sports
create index idx_profile_sports_sport     on public.profile_sports (sport_id);

-- matches
create index idx_matches_host             on public.matches (host_id);
create index idx_matches_sport_status     on public.matches (sport_id, status, starts_at);
create index idx_matches_location         on public.matches using gist (location);
create index idx_matches_open_upcoming    on public.matches (starts_at) where status = 'open';

-- match_participants
create index idx_match_participants_profile on public.match_participants (profile_id, status);

-- ratings
create index idx_ratings_ratee            on public.ratings (ratee_id);
create index idx_ratings_rater            on public.ratings (rater_id);
create index idx_ratings_tags             on public.ratings using gin (tags);

-- listings
create index idx_listings_creator         on public.listings (creator_id);
create index idx_listings_type_sport      on public.listings (type, sport_id, status);
create index idx_listings_location        on public.listings using gist (location);
create index idx_listings_open            on public.listings (created_at desc) where status = 'open';

-- listing_responses
create index idx_listing_responses_responder on public.listing_responses (responder_id);

-- circuits
create index idx_circuits_organizer       on public.circuits (organizer_id);
create index idx_circuits_sport           on public.circuits (sport_id);

-- tournaments
create index idx_tournaments_organizer    on public.tournaments (organizer_id);
create index idx_tournaments_circuit      on public.tournaments (circuit_id);
create index idx_tournaments_sport        on public.tournaments (sport_id);
create index idx_tournaments_status       on public.tournaments (status, starts_at);
create index idx_tournaments_location     on public.tournaments using gist (location);
create index idx_tournaments_source_match on public.tournaments (source_match_id);

-- tournament_registrations
create index idx_registrations_profile    on public.tournament_registrations (profile_id);
create index idx_registrations_status     on public.tournament_registrations (tournament_id, status);

-- tournament_matches
create index idx_tmatches_court           on public.tournament_matches (court_id);
create index idx_tmatches_side_a          on public.tournament_matches (side_a_registration_id);
create index idx_tmatches_side_b          on public.tournament_matches (side_b_registration_id);
create index idx_tmatches_next            on public.tournament_matches (next_match_id);
create index idx_tmatches_stage_status    on public.tournament_matches (stage_id, status);

-- tournament_standings
create index idx_standings_registration   on public.tournament_standings (registration_id);

-- circuit_standings
create index idx_circuit_standings_profile on public.circuit_standings (profile_id);

-- conversations / members / messages
create index idx_conversations_match      on public.conversations (match_id);
create index idx_conversations_tournament on public.conversations (tournament_id);
create index idx_conversations_creator    on public.conversations (created_by);
create index idx_conv_members_profile     on public.conversation_members (profile_id);
create index idx_messages_conversation    on public.messages (conversation_id, created_at desc);
create index idx_messages_sender          on public.messages (sender_id);

-- ============================================================================
-- 8. RPC FUNCTIONS (client-facing API)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8.1 Geospatial discovery — SECURITY INVOKER so table RLS still applies
-- ---------------------------------------------------------------------------
create or replace function public.nearby_matches(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m integer default 10000,
  p_sport_id uuid default null
)
returns table (
  id         uuid,
  title      text,
  sport_id   uuid,
  host_id    uuid,
  venue_name text,
  starts_at  timestamptz,
  capacity   smallint,
  status     public.match_status,
  lat        double precision,
  lng        double precision,
  distance_m double precision
)
language sql stable
set search_path = public, extensions
as $$
  select
    m.id, m.title, m.sport_id, m.host_id, m.venue_name,
    m.starts_at, m.capacity, m.status,
    extensions.st_y(m.location::extensions.geometry) as lat,
    extensions.st_x(m.location::extensions.geometry) as lng,
    extensions.st_distance(
      m.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ) as distance_m
  from public.matches m
  where m.status = 'open'
    and m.is_public
    and m.starts_at > now()
    and (p_sport_id is null or m.sport_id = p_sport_id)
    and extensions.st_dwithin(
      m.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by distance_m;
$$;

create or replace function public.nearby_listings(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m integer default 10000,
  p_type     public.listing_type default null,
  p_sport_id uuid default null
)
returns table (
  id         uuid,
  title      text,
  type       public.listing_type,
  sport_id   uuid,
  creator_id uuid,
  venue_name text,
  created_at timestamptz,
  distance_m double precision
)
language sql stable
set search_path = public, extensions
as $$
  select
    l.id, l.title, l.type, l.sport_id, l.creator_id, l.venue_name, l.created_at,
    extensions.st_distance(
      l.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ) as distance_m
  from public.listings l
  where l.status = 'open'
    and l.location is not null
    and (p_type is null or l.type = p_type)
    and (p_sport_id is null or l.sport_id = p_sport_id)
    and extensions.st_dwithin(
      l.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by distance_m;
$$;

create or replace function public.nearby_tournaments(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m integer default 25000,
  p_sport_id uuid default null
)
returns table (
  id         uuid,
  name       text,
  sport_id   uuid,
  format     public.tournament_format,
  status     public.tournament_status,
  starts_at  timestamptz,
  entry_fee  numeric,
  distance_m double precision
)
language sql stable
set search_path = public, extensions
as $$
  select
    t.id, t.name, t.sport_id, t.format, t.status, t.starts_at, t.entry_fee,
    extensions.st_distance(
      t.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ) as distance_m
  from public.tournaments t
  where t.status in ('registration_open', 'registration_closed', 'in_progress')
    and t.location is not null
    and not t.is_local
    and (p_sport_id is null or t.sport_id = p_sport_id)
    and extensions.st_dwithin(
      t.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by distance_m;
$$;

-- ---------------------------------------------------------------------------
-- 8.2 WhatsApp contact reveal — the ONLY path to whatsapp_phone of others
-- ---------------------------------------------------------------------------
create or replace function public.match_contact_details(p_match_id uuid)
returns table (
  profile_id    uuid,
  display_name  text,
  whatsapp_phone text,
  whatsapp_link text
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_match_member(p_match_id) then
    raise exception 'Only the host and accepted participants can access contact details';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.whatsapp_phone,
    case when p.whatsapp_phone is not null
      then 'https://wa.me/' || regexp_replace(p.whatsapp_phone, '\D', '', 'g')
    end
  from public.profiles p
  where p.id in (
    select m.host_id from public.matches m where m.id = p_match_id
    union
    select mp.profile_id
    from public.match_participants mp
    where mp.match_id = p_match_id and mp.status = 'accepted'
  );
end;
$$;

revoke execute on function public.match_contact_details(uuid) from public, anon;
grant execute on function public.match_contact_details(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8.3 Bracket generation — single elimination (with seeding + byes)
-- ---------------------------------------------------------------------------
create or replace function public.generate_single_elimination_bracket(p_tournament_id uuid)
returns uuid -- the created stage id
language plpgsql security definer
set search_path = public
as $$
declare
  v_stage_id uuid;
  v_regs     uuid[];
  v_n        integer;
  v_rounds   integer;
  v_size     integer;
  v_count    integer;
  v_match_id uuid;
  v_next_ids uuid[];
  v_curr_ids uuid[];
begin
  if not public.is_tournament_organizer(p_tournament_id) then
    raise exception 'Only the tournament organizer can generate the bracket';
  end if;

  select array_agg(id order by coalesce(seed, 32767), registered_at)
  into v_regs
  from public.tournament_registrations
  where tournament_id = p_tournament_id and status = 'approved';

  v_n := coalesce(array_length(v_regs, 1), 0);
  if v_n < 2 then
    raise exception 'At least 2 approved registrations are required (found %)', v_n;
  end if;

  v_rounds := ceil(log(2, v_n))::integer;
  v_size   := (2 ^ v_rounds)::integer;

  insert into public.tournament_stages (tournament_id, stage_number, name, format)
  values (
    p_tournament_id,
    coalesce((select max(stage_number) from public.tournament_stages
              where tournament_id = p_tournament_id), 0) + 1,
    'Main Draw',
    'single_elimination'
  )
  returning id into v_stage_id;

  -- Create rounds from the final backwards so next_match links already exist.
  v_next_ids := null;
  for r in reverse v_rounds .. 1 loop
    v_count    := v_size / (2 ^ r)::integer; -- matches in round r (final = 1)
    v_curr_ids := '{}';

    for j in 1 .. v_count loop
      insert into public.tournament_matches (
        stage_id, round_number, bracket_position, next_match_id, next_match_slot
      )
      values (
        v_stage_id, r, j,
        case when r < v_rounds then v_next_ids[(j + 1) / 2] end,
        case when r < v_rounds then ((j - 1) % 2) + 1 end
      )
      returning id into v_match_id;

      v_curr_ids := v_curr_ids || v_match_id;
    end loop;

    v_next_ids := v_curr_ids;
  end loop;

  -- Classic seeding: pair seed j against seed (size - j + 1); top seeds get byes.
  for j in 1 .. (v_size / 2) loop
    update public.tournament_matches
    set side_a_registration_id = v_regs[j],
        side_b_registration_id = case when (v_size - j + 1) <= v_n
                                      then v_regs[v_size - j + 1] end
    where id = v_next_ids[j];
  end loop;

  -- Resolve byes immediately; trg_bracket_advance propagates the winners.
  update public.tournament_matches
  set status = 'walkover', winner_side = 1, completed_at = now()
  where stage_id = v_stage_id
    and round_number = 1
    and side_a_registration_id is not null
    and side_b_registration_id is null;

  return v_stage_id;
end;
$$;

revoke execute on function public.generate_single_elimination_bracket(uuid) from public, anon;
grant execute on function public.generate_single_elimination_bracket(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8.4 Bracket generation — round robin (circle method)
-- ---------------------------------------------------------------------------
create or replace function public.generate_round_robin(p_tournament_id uuid)
returns uuid -- the created stage id
language plpgsql security definer
set search_path = public
as $$
declare
  v_stage_id uuid;
  v_players  uuid[];
  v_n        integer;
  v_m        integer;
  v_pos      integer;
  v_a        uuid;
  v_b        uuid;
begin
  if not public.is_tournament_organizer(p_tournament_id) then
    raise exception 'Only the tournament organizer can generate the schedule';
  end if;

  select array_agg(id order by coalesce(seed, 32767), registered_at)
  into v_players
  from public.tournament_registrations
  where tournament_id = p_tournament_id and status = 'approved';

  v_n := coalesce(array_length(v_players, 1), 0);
  if v_n < 2 then
    raise exception 'At least 2 approved registrations are required (found %)', v_n;
  end if;

  if v_n % 2 = 1 then
    v_players := v_players || null::uuid; -- bye slot
  end if;
  v_m := array_length(v_players, 1);

  insert into public.tournament_stages (tournament_id, stage_number, name, format)
  values (
    p_tournament_id,
    coalesce((select max(stage_number) from public.tournament_stages
              where tournament_id = p_tournament_id), 0) + 1,
    'Round Robin',
    'round_robin'
  )
  returning id into v_stage_id;

  for r in 1 .. (v_m - 1) loop
    v_pos := 0;
    for i in 1 .. (v_m / 2) loop
      v_a := v_players[i];
      v_b := v_players[v_m - i + 1];
      if v_a is not null and v_b is not null then
        v_pos := v_pos + 1;
        insert into public.tournament_matches (
          stage_id, round_number, bracket_position,
          side_a_registration_id, side_b_registration_id
        )
        values (v_stage_id, r, v_pos, v_a, v_b);
      end if;
    end loop;
    -- rotate all players except the first (circle method)
    v_players := array[v_players[1], v_players[v_m]] || v_players[2 : v_m - 1];
  end loop;

  return v_stage_id;
end;
$$;

revoke execute on function public.generate_round_robin(uuid) from public, anon;
grant execute on function public.generate_round_robin(uuid) to authenticated;

-- ============================================================================
-- 9. STORAGE BUCKETS & POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Avatars: public read; users write only inside their own {uid}/ folder.
create policy "Avatar images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "Users upload avatars to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users update their own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Receipts: path convention {registration_id}/{filename}.
-- Upload: only the registrant. Read: registrant + tournament organizer.
create policy "Registrants upload receipts for their registration"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.tournament_registrations tr
      where tr.id::text = (storage.foldername(name))[1]
        and tr.profile_id = (select auth.uid())
    )
  );

create policy "Registrants and organizers read receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and exists (
      select 1
      from public.tournament_registrations tr
      join public.tournaments t on t.id = tr.tournament_id
      where tr.id::text = (storage.foldername(name))[1]
        and (tr.profile_id = (select auth.uid()) or t.organizer_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- 10. SUPABASE REALTIME REPLICATION
-- ============================================================================
-- Tables that require multi-device instant state updates:
--   matches               -> status/capacity flips (open -> full -> open)
--   match_participants    -> join request lifecycle (pending/accepted/rejected)
--   tournament_matches    -> LIVE SCORES + court assignments
--   tournament_standings  -> live leaderboard refresh
--   messages              -> future in-app chat (already wired)
-- REPLICA IDENTITY FULL so UPDATE events carry the previous row state.

alter table public.matches              replica identity full;
alter table public.match_participants   replica identity full;
alter table public.tournament_matches   replica identity full;
alter table public.tournament_standings replica identity full;
alter table public.messages             replica identity full;

alter publication supabase_realtime add table
  public.matches,
  public.match_participants,
  public.tournament_matches,
  public.tournament_standings,
  public.messages;

-- ============================================================================
-- 11. SEED DATA — sports catalog
-- ============================================================================

insert into public.sports (slug, name, players_per_side, min_players, default_scoring_config) values
  ('padel',        'Padel',            2, 4, '{"sets_to_win": 2, "games_per_set": 6, "tie_break": true, "tie_break_points": 7, "golden_point": true}'),
  ('tennis',       'Tennis',           1, 2, '{"sets_to_win": 2, "games_per_set": 6, "tie_break": true, "tie_break_points": 7}'),
  ('pickleball',   'Pickleball',       2, 2, '{"sets_to_win": 2, "points_per_game": 11, "win_by": 2}'),
  ('football-5',   '5-a-side Football', 5, 10, '{"halves": 2, "minutes_per_half": 25}'),
  ('basketball-3x3','3x3 Basketball',  3, 6, '{"target_points": 21, "minutes": 10}'),
  ('beach-volley', 'Beach Volleyball', 2, 4, '{"sets_to_win": 2, "points_per_set": 21, "tie_break_points": 15}')
on conflict (slug) do nothing;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
