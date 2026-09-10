-- Revises the catalog tables from 0001_catalog_sync.sql to match the
-- manual-entry approach (spec §5, revised) -- the WordPress sync has been
-- removed entirely, and this adds what the admin product screen needs
-- instead: admin accounts, and a simpler product shape with no
-- WordPress-specific fields.
--
-- Run this in the Supabase SQL Editor: paste the whole file, click Run.
-- Safe to re-run.

-- No more scheduled sync jobs, so there's nothing to log runs for.
drop table if exists catalog_sync_runs;

-- The relational locations/product_locations tables were built to mirror
-- WordPress's multi-location tagging on each post. A manually-entered
-- product just needs one plain location string -- matches the core
-- Product model's original, simpler shape (spec §6: "duration, location,
-- images[], category").
drop table if exists product_locations;
drop table if exists locations;

-- Products: drop every WordPress-sourced column that the manual admin
-- form (spec §5, revised) doesn't cover -- there's no automated way to
-- fill these in anymore, and re-typing a full day-by-day itinerary or
-- FAQ list by hand isn't in scope for the Phase 1 form. The description
-- field is where that kind of detail goes for now, in plain prose.
alter table products drop column if exists wp_post_id;
alter table products drop column if exists last_synced_at;
alter table products drop column if exists includes;
alter table products drop column if exists excludes;
alter table products drop column if exists highlights;
alter table products drop column if exists itinerary;
alter table products drop column if exists faq;
alter table products drop column if exists lat;
alter table products drop column if exists lng;
alter table products drop column if exists min_people;
alter table products drop column if exists max_people;

alter table products rename column description_html to description;

alter table products drop constraint if exists products_wp_type_check;
alter table products rename column wp_type to product_type;
alter table products add constraint products_product_type_check
  check (product_type in ('tour', 'activity', 'car_hire', 'transport'));

alter table products add column if not exists location text;
alter table products add column if not exists category text;

-- The per-date cap a product allows, set directly by whoever adds the
-- product (matches the core Product model's capacity_per_date from §6 --
-- null means unlimited). availability_slots (unchanged by this
-- migration) still tracks actual bookings against this ceiling as they
-- come in; this column is just where that ceiling now comes from.
alter table products add column if not exists capacity_per_date integer;

-- Optional link to the matching page on adventure-lombok.com -- not used
-- for syncing anything, just an optional "see more on our site" link and
-- (Phase 3, §6n) the target for pushing reviews back to the website.
alter table products add column if not exists source_url text;

-- Admin accounts (spec §6k). A row here is what actually grants access
-- to /admin -- having a Supabase Auth login alone isn't enough. Only
-- super_admin is enforced meaningfully in Phase 1 (there's only one of
-- you); the narrower roles are stored for when Phase 4 enforces them.
create table if not exists admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'super_admin'
    check (role in ('super_admin', 'reservations', 'accounting', 'support')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

drop policy if exists "Admins can read their own row" on admin_users;
create policy "Admins can read their own row" on admin_users
  for select using (auth.uid() = id);

-- Admins need to see every product (not just 'active' ones, unlike the
-- public policy from 0001) and to actually write to the table -- there's
-- no service-role sync job doing that anymore, so real write policies
-- are needed for the first time.
drop policy if exists "Admins can read all products" on products;
create policy "Admins can read all products" on products
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can insert products" on products;
create policy "Admins can insert products" on products
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update products" on products;
create policy "Admins can update products" on products
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Where product photos live. Public read (customers need to see them),
-- admin-only write.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );
