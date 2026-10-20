-- Spec §13: "access to [a passport scan] should be logged (who viewed
-- which passport, when) in case that's ever needed for a dispute." The
-- scan itself was always correctly stored in a private bucket
-- (0016_rinjani_manual_confirmation.sql) -- this just adds the missing
-- access trail on top of that.
--
-- One row per signed-URL grant, not per actual click-through on the
-- link: /admin/requests/[id] (the only page that ever shows a passport
-- scan) generates the signed URL up front for every traveler with one
-- on file, and that's the real access-control moment -- the admin has
-- a working link the second the page renders, whether or not they
-- open it. Logging there is what makes "who had access, when"
-- answerable, same reasoning as a signed URL's own short TTL.
--
-- Run in the Supabase SQL Editor, same as every earlier migration.

create table if not exists passport_access_log (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references travelers(id) on delete cascade,
  admin_id uuid not null references admin_users(id),
  viewed_at timestamptz not null default now()
);

create index if not exists passport_access_log_traveler_id_idx on passport_access_log(traveler_id);

-- Same "private bucket, zero RLS policies for anyone but our own
-- trusted server code" posture as the scans themselves -- RLS enabled,
-- and the only two policies are: an admin can log their own view, and
-- any active admin can read the full trail (so a dispute isn't
-- answerable only by whoever happened to be the viewer).
alter table passport_access_log enable row level security;

drop policy if exists "Admins can log their own passport views" on passport_access_log;
create policy "Admins can log their own passport views" on passport_access_log
  for insert
  with check (
    admin_id = auth.uid()
    and exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can read the passport access trail" on passport_access_log;
create policy "Admins can read the passport access trail" on passport_access_log
  for select
  using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );
