-- push Edge Function reads recipient tokens and deletes stale rows via service_role.
-- RLS is bypassed, but table-level grants are still required (see 20260823120000).

grant select, delete on public.push_tokens to service_role;
