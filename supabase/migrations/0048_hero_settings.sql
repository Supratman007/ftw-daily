-- Self-service homepage hero content -- same app_settings singleton
-- row the USD->IDR rate already lives on (migration 0046). All seven
-- columns are nullable and default to null, which means "use the
-- built-in default" (the hardcoded copy in
-- src/lib/i18n/dictionaries/en.ts / id.ts, and the illustrated
-- teal background with no photo) -- so this migration changes nothing
-- about the live homepage until a Super Admin actually sets one of
-- these from /admin/settings. See src/lib/heroSettings.ts for the
-- merge logic and src/components/pages/HomePage.tsx for where it's
-- rendered.
alter table app_settings
  add column if not exists hero_image_url text,
  add column if not exists hero_badge_en text,
  add column if not exists hero_badge_id text,
  add column if not exists hero_headline_en text,
  add column if not exists hero_headline_id text,
  add column if not exists hero_subheadline_en text,
  add column if not exists hero_subheadline_id text;

-- No RLS changes needed -- app_settings' existing "Anyone can read" /
-- "Admins can update" policies (migration 0046) already cover these
-- new columns along with the rest of the row. The hero photo itself
-- reuses the product-images storage bucket (migration 0002), whose
-- "any active admin can upload" policy already covers a Super-Admin-
-- only page uploading through it, same as every other admin-uploaded
-- photo in this app.
