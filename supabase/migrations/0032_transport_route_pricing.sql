-- Transport pricing was keyed by (vehicle type, one area) -- implicitly
-- assuming the other end of every trip was the product itself (e.g. a
-- product literally called "Lombok Airport Transfer"). That doesn't
-- hold for genuine point-to-point routes where neither end is a fixed
-- anchor (Senggigi -> Tete Batu, Senggigi -> Kuta, etc.), so pricing
-- now keys off a real (vehicle type, from area, to area) route -- the
-- same shape as how every competitor's per-route page actually works.
-- One Transport product can now hold every route it offers, not just
-- trips to/from one fixed point. Run in the Supabase SQL Editor, same
-- as earlier migrations.

-- This feature shipped very recently with no real prices in it yet
-- (single-area pricing, migration 0030) -- rather than guess which
-- end any existing row's one area was meant to be, this starts the
-- route grid fresh. Nothing meaningful is lost.
delete from transport_prices;

alter table transport_prices rename column meeting_point_id to from_meeting_point_id;
alter table transport_prices add column to_meeting_point_id uuid references meeting_points (id) on delete cascade;
alter table transport_prices alter column to_meeting_point_id set not null;

alter table transport_prices drop constraint if exists transport_prices_vehicle_type_id_meeting_point_id_key;
alter table transport_prices add constraint transport_prices_route_key
  unique (vehicle_type_id, from_meeting_point_id, to_meeting_point_id);
alter table transport_prices add constraint transport_prices_different_points
  check (from_meeting_point_id <> to_meeting_point_id);

-- Bookings already have a pickup meeting point (meeting_point_id /
-- meeting_point_custom, shared with Car Hire, which only ever needs a
-- pickup -- the car stays with the customer). Transport now needs a
-- separate drop-off, same "real area, or a custom exact spot" shape.
alter table bookings
  add column if not exists dropoff_meeting_point_id uuid references meeting_points (id),
  add column if not exists dropoff_location_custom text;
