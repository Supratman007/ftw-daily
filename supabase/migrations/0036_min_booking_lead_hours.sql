-- Booking lead-time cutoff: how many hours before a trip/pickup starts
-- do we still accept a new online booking? Admin-editable per product
-- (same "config, not hardcoded" pattern as the cancellation fee
-- schedule and commission tiers), rather than one fixed number for
-- every product -- a day trip and a multi-day trip need different
-- amounts of prep time.
--
-- Defaulting every existing product to 10 hours: fine as-is for day
-- trips/activities and Car Hire/Transport pickups. If you have a
-- multi-day or extension trip that's still instantly bookable (not
-- routed through the Rinjani-style manual request flow), edit that
-- product afterward and raise it -- 72 (3 days) is a reasonable
-- starting point.
--
-- Run in the Supabase SQL Editor, same as earlier migrations.

alter table products
  add column if not exists min_lead_hours integer not null default 10;

alter table products drop constraint if exists products_min_lead_hours_check;
alter table products add constraint products_min_lead_hours_check check (min_lead_hours >= 0);
