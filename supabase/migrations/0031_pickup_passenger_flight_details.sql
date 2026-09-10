-- Car Hire/Transport bookings previously had no way to capture who's
-- actually traveling (the account holder booking online isn't always
-- the passenger) or flight details for an airport pickup -- both
-- essential for a driver doing a "meet and greet" at arrivals. Run in
-- the Supabase SQL Editor, same as earlier migrations.
alter table bookings
  add column if not exists passenger_name text,
  add column if not exists flight_details text;
