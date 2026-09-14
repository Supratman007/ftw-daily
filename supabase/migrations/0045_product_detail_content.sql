-- Richer product-page content: highlights, what's included/not
-- included, a day-by-day itinerary, and practical trip notes -- the
-- kind of detail GetYourGuide/TourRadar/Bookmundi-style listings show
-- and this app's product page didn't have anywhere to put.
--
-- These columns actually existed once (0001_catalog_sync.sql's
-- WordPress-sourced `includes`/`excludes`/`highlights`/`itinerary`),
-- but were deliberately dropped in 0002_manual_catalog.sql when the
-- WordPress sync was scrapped for manual admin entry -- "re-typing a
-- full day-by-day itinerary... isn't in scope for the Phase 1 form."
-- This is that scope, now actually wanted: same idea, re-added as a
-- fresh set of columns (not reusing the old names blindly, since
-- itinerary's shape here is admin-entered {title, description} pairs,
-- not whatever WordPress happened to return) with real defaults so
-- every existing product just shows an empty section until an admin
-- fills it in, rather than a null-shaped error.
alter table products add column if not exists highlights text[] not null default '{}';
alter table products add column if not exists includes text[] not null default '{}';
alter table products add column if not exists excludes text[] not null default '{}';
alter table products add column if not exists trip_notes text[] not null default '{}';
-- One entry per itinerary stop/day: [{ "title": "...", "description": "..." }, ...].
-- Deliberately not "day 1, day 2, ..." -- a single-day trip with
-- several stops (a snorkeling day trip's stop-by-stop plan) fits the
-- same shape as a multi-day trek's day-by-day one.
alter table products add column if not exists itinerary jsonb not null default '[]'::jsonb;
