-- Server-side rate limiting for the public forms most exposed to
-- automated abuse: checkout/request/gift-purchase submissions, the
-- Contact form, and signup/login -- the actual vector behind a past
-- mass fake-account/fake-email attack, per the founder. The honeypot
-- field already on these forms catches bots that blindly fill in
-- every field, but does nothing against a scripted flood that only
-- ever submits the real fields -- this caps how many attempts one IP
-- can make against one form in a time window, regardless of how
-- convincing each individual submission looks.
--
-- One row per attempt rather than a running counter column: cheap to
-- reason about, self-expiring (old rows just age out of the window
-- a caller asks about), and avoids the read-then-write race a shared
-- counter would need extra locking to avoid.
create table if not exists rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_created_idx
  on rate_limit_hits (bucket_key, created_at);

alter table rate_limit_hits enable row level security;
-- No policies at all -- this table is never read or written except
-- through check_rate_limit() below via the service-role client, same
-- "zero RLS policies" approach as booking-documents/agent-documents
-- storage.

-- Checks how many attempts bucket p_key has made in the last
-- p_window_minutes; if it's already at or over p_max_attempts, denies
-- the request (returns false) without recording anything further. A
-- caller that IS allowed gets its attempt recorded here in the same
-- call, so back-to-back calls see an up-to-date count -- not
-- perfectly race-free under true concurrency, but a form submission
-- isn't a high-frequency path, and a small race window costing one or
-- two extra attempts is not a real security concern for the volumes
-- this defends against. p_key should already be scoped per form (e.g.
-- "signup:203.0.113.4"), not just the raw IP, so one endpoint's abuse
-- doesn't spend another endpoint's budget for the same visitor.
create or replace function check_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_minutes integer
) returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  -- Opportunistic cleanup so this table doesn't grow forever -- cheap
  -- with the index above, and every call is as good a time as any.
  delete from rate_limit_hits where created_at < now() - interval '1 day';

  select count(*) into v_count
  from rate_limit_hits
  where bucket_key = p_key
    and created_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into rate_limit_hits (bucket_key) values (p_key);
  return true;
end;
$$;

revoke execute on function check_rate_limit(text, integer, integer) from public;
grant execute on function check_rate_limit(text, integer, integer) to service_role;
