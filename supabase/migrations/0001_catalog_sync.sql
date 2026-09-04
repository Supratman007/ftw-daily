-- Phase 1: WordPress catalog sync tables.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query,
-- paste this whole file, click Run). Safe to re-run: every statement is
-- idempotent (IF NOT EXISTS / CREATE OR REPLACE).

create extension if not exists pgcrypto;

-- Locations are NOT reliably available from WordPress's public API (the
-- get-locations endpoint requires a login we don't have). Instead this is a
-- small table we maintain ourselves, mapping WordPress's internal location
-- ID (seen in each product's `multi_location` field) to a real place name.
-- Add rows here as new locations show up in synced products with no match.
create table if not exists locations (
  id serial primary key,
  wp_location_id integer unique not null,
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- One row per Tour or Activity pulled from adventure-lombok.com.
-- wp_post_id is the sync key: it's how we recognize "this is the same
-- product as last time" across sync runs, no matter what else changes.
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  wp_post_id integer unique not null,
  wp_type text not null check (wp_type in ('tour', 'activity')),
  slug text unique not null,

  title text not null,
  excerpt text,
  description_html text,
  cover_image_url text,
  gallery_urls text[] not null default '{}',

  duration_label text,

  -- Prices as WordPress gives them (USD). IDR is computed at display/
  -- checkout time from src/lib/currency.ts, never stored, so changing the
  -- conversion rate never requires a re-sync or a data migration.
  adult_price_usd numeric,
  child_price_usd numeric,
  infant_price_usd numeric,

  min_people integer,
  max_people integer,

  includes text,
  excludes text,
  highlights text,
  itinerary jsonb,
  faq jsonb,

  lat numeric,
  lng numeric,

  -- False for Rinjani-style products (name-matched at sync time, see
  -- src/lib/sync/syncCatalog.ts) -- Phase 1's checkout only supports
  -- instant book & pay, so these are synced but not offered for booking
  -- yet. Revisit once Phase 2 builds the real request-to-book flow.
  is_bookable boolean not null default true,

  -- 'active' while it still shows up in WordPress; 'inactive' if a later
  -- sync no longer sees it there. Never deleted, so past bookings (once
  -- bookings exist) still resolve to a real product record.
  status text not null default 'active' check (status in ('active', 'inactive')),

  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on products (status);
create index if not exists products_wp_type_idx on products (wp_type);

create table if not exists product_locations (
  product_id uuid not null references products (id) on delete cascade,
  location_id integer not null references locations (id) on delete cascade,
  primary key (product_id, location_id)
);

-- Phase 1's own capacity tracking. A row only exists once someone has
-- actually tried to book a given product on a given date -- we don't
-- pre-generate a calendar of empty rows. capacity_total defaults to that
-- product's max_people at the moment the row is first created.
create table if not exists availability_slots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  slot_date date not null,
  capacity_total integer not null,
  capacity_booked integer not null default 0 check (capacity_booked >= 0),
  -- Mirrors WordPress's own per-date Available/Sold out/Blocked calendar,
  -- if/when the sync can reach it (see docs/adventure-lombok-booking-spec.md
  -- discussion -- as of Phase 1 build time, no public API route for it was
  -- found, so this stays null until that's resolved). When set, it acts as
  -- a hard override even if our own capacity_booked hasn't caught up.
  wp_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, slot_date)
);

-- One row per sync job run, so "why isn't my new tour showing up" has a
-- concrete answer instead of a guess.
create table if not exists catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  products_seen integer not null default 0,
  products_upserted integer not null default 0,
  products_deactivated integer not null default 0,
  errors jsonb not null default '[]'
);

create index if not exists catalog_sync_runs_started_at_idx on catalog_sync_runs (started_at desc);

-- Row Level Security: Supabase leaves this off by default, which would
-- otherwise let the public anon key (used in the browser) write directly
-- to these tables via Supabase's REST API, not just read them. The sync
-- job writes using the service_role key, which bypasses RLS entirely --
-- so it's unaffected by any of this. Everyone else gets read-only access
-- to the catalog tables, and no access at all to the sync log.
alter table locations enable row level security;
alter table products enable row level security;
alter table product_locations enable row level security;
alter table availability_slots enable row level security;
alter table catalog_sync_runs enable row level security;

drop policy if exists "Public can read locations" on locations;
create policy "Public can read locations" on locations for select using (true);

drop policy if exists "Public can read active products" on products;
create policy "Public can read active products" on products for select using (status = 'active');

drop policy if exists "Public can read product_locations" on product_locations;
create policy "Public can read product_locations" on product_locations for select using (true);

drop policy if exists "Public can read availability_slots" on availability_slots;
create policy "Public can read availability_slots" on availability_slots for select using (true);

-- No public policy on catalog_sync_runs at all -- it's an internal
-- diagnostics log, not customer-facing data.
