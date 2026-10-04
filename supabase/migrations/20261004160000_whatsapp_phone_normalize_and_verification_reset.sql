-- Increment 1: normalize legacy AR whatsapp_phone values; clear verification when phone changes.
--
-- Before applying in production, run read-only inventory (no PII in tickets — counts only):
--   SELECT count(*) FROM public.profiles WHERE whatsapp_phone IS NOT NULL;
--   SELECT left(whatsapp_phone, 4) AS prefix, count(*) FROM public.profiles
--     WHERE whatsapp_phone IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;

-- ---------------------------------------------------------------------------
-- 1. Conservative normalization: +54… missing mobile 9 → +549…
-- ---------------------------------------------------------------------------
do $$
declare
  v_updated integer := 0;
begin
  update public.profiles p
  set whatsapp_phone = '+549' || substring(p.whatsapp_phone from 4)
  where p.whatsapp_phone is not null
    and p.whatsapp_phone like '+54%'
    and p.whatsapp_phone not like '+549%'
    and char_length(p.whatsapp_phone) between 12 and 13
    and substring(p.whatsapp_phone from 4) ~ '^[1-9][0-9]{9,10}$'
    and (p.whatsapp_phone ~ '^\+[1-9][0-9]{6,14}$');

  get diagnostics v_updated = row_count;
  raise notice 'whatsapp_phone normalization: updated % row(s)', v_updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Clear whatsapp_verified_at when whatsapp_phone changes
-- ---------------------------------------------------------------------------
create or replace function public.clear_whatsapp_verification_on_phone_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.whatsapp_phone is distinct from old.whatsapp_phone then
    new.whatsapp_verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clear_whatsapp_verification_on_phone_change on public.profiles;

create trigger trg_clear_whatsapp_verification_on_phone_change
  before update of whatsapp_phone on public.profiles
  for each row
  execute function public.clear_whatsapp_verification_on_phone_change();

-- ---------------------------------------------------------------------------
-- 3. Allow verification reset when phone changes (client updates phone only)
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if current_setting('padelcito.profile_internal_update', true) = 'true' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Cannot change platform role';
  end if;

  if new.banned_at is distinct from old.banned_at then
    raise exception 'Cannot change ban status';
  end if;

  if new.whatsapp_verified_at is distinct from old.whatsapp_verified_at then
    if new.whatsapp_phone is distinct from old.whatsapp_phone
       and new.whatsapp_verified_at is null then
      return new;
    end if;
    raise exception 'Cannot change WhatsApp verification status';
  end if;

  if new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.reliability_score is distinct from old.reliability_score
     or new.penalty_count is distinct from old.penalty_count
     or new.commitment_count is distinct from old.commitment_count then
    raise exception 'Trust aggregates are read-only';
  end if;

  return new;
end;
$$;
