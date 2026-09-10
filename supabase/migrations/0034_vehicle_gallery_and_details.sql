-- Car types and Transport vehicle types get a real photo gallery
-- (multiple photos, same as products.gallery_urls) plus marketing
-- copy -- a description and a short "recommended for" line -- so the
-- product page can actually sell the choice, not just list a name and
-- a dropdown. Run in the Supabase SQL Editor, same as earlier
-- migrations.

alter table car_types
  add column if not exists description text,
  add column if not exists recommended_for text,
  add column if not exists gallery_urls text[] not null default '{}';

-- Carry the single photo already uploaded (migration 0028) into the
-- new gallery so nothing already set up is lost.
update car_types
set gallery_urls = array[image_url]
where image_url is not null and gallery_urls = '{}';

alter table transport_vehicle_types
  add column if not exists description text,
  add column if not exists recommended_for text,
  -- Transport vehicle types never had a features tag list -- Car
  -- Hire's car_types always has (e.g. "AC, Driver included").
  add column if not exists features text[] not null default '{}',
  add column if not exists gallery_urls text[] not null default '{}';

update transport_vehicle_types
set gallery_urls = array[image_url]
where image_url is not null and gallery_urls = '{}';
