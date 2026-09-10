-- Indonesian machine translation for trip content (title/excerpt/
-- description) -- confirmed directly: draft translations are
-- generated automatically (via Google Cloud Translation, called from
-- the admin product create/update actions) whenever the English
-- content changes, but never show to customers until an admin
-- reviews and approves them on the product's edit page -- machine
-- translation can be awkward or wrong, so nothing goes live
-- unreviewed.
--
-- translated_from_* records exactly what English text a translation
-- was generated from, so a later English edit can be detected (the
-- current English no longer matches what's stored here) and trigger a
-- fresh draft, rather than silently leaving stale Indonesian text
-- under new English content.
--
-- Run in the Supabase SQL Editor, same as earlier migrations.

alter table products
  add column if not exists title_id text,
  add column if not exists excerpt_id text,
  add column if not exists description_id text,
  add column if not exists translation_status text not null default 'none'
    check (translation_status in ('none', 'draft', 'approved')),
  add column if not exists translated_from_title text,
  add column if not exists translated_from_excerpt text,
  add column if not exists translated_from_description text;
