-- Revises the catalog tables from 0001_catalog_sync.sql to match the
-- manual-entry approach (spec §5, revised) -- the WordPress sync has been
-- removed entirely. Run this in the Supabase SQL Editor the same way as
-- 0001: paste the whole file, click Run. Safe to re-run.

-- No more scheduled sync jobs, so there's nothing to log runs for.
drop table if exists catalog_sync_runs;

-- Products are now added by hand for all four types (Tours, Activities,
-- Car Hire, Transport) -- there's no longer a WordPress post behind each
-- one, so the sync-specific columns go away.
alter table products drop column if exists wp_post_id;
alter table products drop column if exists last_synced_at;

alter table products drop constraint if exists products_wp_type_check;
alter table products rename column wp_type to product_type;
alter table products add constraint products_product_type_check
  check (product_type in ('tour', 'activity', 'car_hire', 'transport'));

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

-- Locations are now a plain admin-managed list -- no WordPress ID to key
-- off of, since nothing is pulled from there anymore.
alter table locations drop constraint if exists locations_wp_location_id_key;
alter table locations drop column if exists wp_location_id;
