-- Website traffic/visitor tracking, built in-house (spec §12 Phase 4's
-- "Analytics" item, the part not covered by the confirmed-bookings-only
-- analytics already shipped): one row per real page view of the public,
-- customer-facing site, so /admin/analytics can show top pages, unique
-- visitors, and where traffic actually comes from.
--
-- No public RLS policies at all, on purpose -- same "public data only
-- moves through server code, never a direct client-writable policy"
-- pattern already used for gift_vouchers and cancellation evidence.
-- Every row is written by src/app/api/track/route.ts using the
-- service-role client (bypasses RLS), from a small client-side beacon
-- (src/components/PageViewTracker.tsx) fired only after a real browser
-- has actually rendered the page -- most simple bots/crawlers never
-- execute that JS at all, so this naturally excludes most of them
-- without any extra bot-detection logic. Every read (the Analytics
-- page) also goes through the service-role client, admin-only.
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  locale text not null default 'en' check (locale in ('en', 'id')),
  -- Hostname only, never the full referring URL -- enough to see "came
  -- from Instagram/Google/etc." without capturing a referrer's full
  -- path or query string, which can carry identifying info that isn't
  -- this app's to collect. Null for direct traffic or same-site
  -- navigation (internal referrers aren't a useful "where did this
  -- visitor come from" signal).
  referrer_host text,
  -- A random id in a first-party cookie (see the track route), not
  -- tied to any account or email -- just enough to tell "3 views, 1
  -- visitor" apart from "3 views, 3 visitors" for the same page.
  visitor_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at);
create index if not exists page_views_path_idx on page_views (path);

alter table page_views enable row level security;
