-- Dispatch push delivery when a notification row is inserted.
-- Uses pg_net to POST the new row to the push Edge Function.
--
-- Setup (local + hosted): create Vault secrets before expecting delivery:
--   select vault.create_secret('<url>', 'push_edge_function_url', 'Push Edge Function URL');
--   select vault.create_secret('<secret>', 'push_webhook_secret', 'Push webhook shared secret');
--
-- Local URL example: http://host.docker.internal:54321/functions/v1/push
-- Hosted URL example: https://<project-ref>.supabase.co/functions/v1/push
--
-- Alternative: configure the same payload via Dashboard Database Webhooks (Insert on
-- public.notifications → push Edge Function). This migration keeps delivery in SQL.

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
  v_payload jsonb;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'push_edge_function_url'
  limit 1;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;

  if v_url is null or v_secret is null or length(trim(v_url)) = 0 or length(trim(v_secret)) = 0 then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', to_jsonb(new)
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-webhook-secret', v_secret
    )::jsonb,
    body := v_payload
  );

  return new;
end;
$$;

revoke all on function public.dispatch_push_notification() from public, anon, authenticated;

create trigger trg_push_on_notification
  after insert on public.notifications
  for each row
  execute function public.dispatch_push_notification();
