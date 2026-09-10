-- Adds simple pickup/accommodation info to bookings -- requested
-- directly (not in the original spec, which only planned a fuller
-- meeting-point picker for Car Hire/Transport specifically, as a Phase
-- 3 item). This is a lighter-weight version that applies to every
-- product type, since knowing where to collect a guest matters for
-- Tours and Activities too, not just Car Hire/Transport. Run in the
-- Supabase SQL Editor the same way as the earlier migrations.

alter table bookings add column if not exists hotel_name text;
alter table bookings add column if not exists room_number text;
