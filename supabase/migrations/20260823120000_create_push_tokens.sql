-- Expo push tokens per device. Clients upsert their token after permission grant;
-- the push Edge Function reads enabled rows with service_role to deliver alerts.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  device_id       text,
  platform        text not null check (platform in ('ios', 'android')),
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint push_tokens_expo_push_token_key unique (expo_push_token)
);

comment on table public.push_tokens is
  'Expo push tokens registered by authenticated clients; read by push Edge Function via service_role.';

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
create index idx_push_tokens_user_id
  on public.push_tokens (user_id);

create index idx_push_tokens_user_enabled
  on public.push_tokens (user_id)
  where enabled = true;

-- ---------------------------------------------------------------------------
-- 3. updated_at maintenance
-- ---------------------------------------------------------------------------
create trigger trg_push_tokens_updated_at
  before update on public.push_tokens
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. RLS + grants
-- ---------------------------------------------------------------------------
alter table public.push_tokens enable row level security;

revoke all on public.push_tokens from anon, authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

create policy "Users manage own push tokens"
  on public.push_tokens for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
