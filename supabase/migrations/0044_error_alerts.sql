-- Error alerting (last of the "missed or forgot" list before performance
-- polish): "find out from an automatic email, not from a customer
-- complaint" -- the same low-cost, no-new-service approach as this
-- session's other additions. Deliberately does NOT bring in Sentry or
-- any other third party (no new account to sign up for, no new secret
-- to configure) -- it reuses the Resend integration and admin_users
-- table this app already has for every other notification.
--
-- One row per *distinct* error (see the signature this app computes in
-- src/lib/alerts/errorAlerts.ts, from where + what broke), not one row
-- per occurrence -- occurrence_count/last_seen_at track how often it
-- keeps happening without needing a second table. No public RLS
-- policies at all, same "service-role client only" pattern as
-- page_views and referral_attributions: every write and read here goes
-- through instrumentation.ts / the client-error API route / the (future)
-- admin error log, never a customer-writable policy.
create table if not exists error_alerts (
  id uuid primary key default gen_random_uuid(),
  signature text not null unique,
  source text not null check (source in ('server', 'client')),
  message text not null,
  route_path text,
  route_type text,
  occurrence_count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Null until the first alert email actually goes out; the cooldown
  -- window (see record_error_alert below) is measured from here, not
  -- from first_seen_at/last_seen_at.
  last_alerted_at timestamptz
);

create index if not exists error_alerts_last_seen_at_idx on error_alerts (last_seen_at desc);

alter table error_alerts enable row level security;

-- Records one occurrence of an error and decides whether this is worth
-- a *new* email or just another tally mark -- without this, one broken
-- page hit by ten visitors in a minute would mean ten emails instead
-- of one. Returns should_alert=true at most once per p_cooldown_minutes
-- for the same signature; every call still increments occurrence_count
-- regardless, so the count an admin eventually sees is accurate even
-- though the emails are throttled.
--
-- The insert-with-on-conflict-do-nothing before the row lock is
-- deliberate: it guarantees a row exists first so two concurrent
-- first-ever occurrences of the same brand-new error can't race each
-- other into a duplicate-key error.
create or replace function record_error_alert(
  p_signature text,
  p_source text,
  p_message text,
  p_route_path text,
  p_route_type text,
  p_cooldown_minutes integer
)
returns table (should_alert boolean, occurrence_count integer)
language plpgsql
as $$
declare
  v_last_alerted_at timestamptz;
  v_should_alert boolean;
  v_occurrence_count integer;
begin
  insert into error_alerts (signature, source, message, route_path, route_type, occurrence_count, last_alerted_at)
  values (p_signature, p_source, p_message, p_route_path, p_route_type, 0, null)
  on conflict (signature) do nothing;

  select error_alerts.last_alerted_at into v_last_alerted_at
  from error_alerts
  where error_alerts.signature = p_signature
  for update;

  v_should_alert := v_last_alerted_at is null
    or v_last_alerted_at < now() - (p_cooldown_minutes || ' minutes')::interval;

  update error_alerts
  set occurrence_count = error_alerts.occurrence_count + 1,
      last_seen_at = now(),
      message = p_message,
      last_alerted_at = case when v_should_alert then now() else error_alerts.last_alerted_at end
  where error_alerts.signature = p_signature
  returning error_alerts.occurrence_count into v_occurrence_count;

  return query select v_should_alert, v_occurrence_count;
end;
$$;

revoke execute on function record_error_alert(text, text, text, text, text, integer) from public;
grant execute on function record_error_alert(text, text, text, text, text, integer) to service_role;
