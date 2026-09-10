-- Car Hire/Transport pickup WhatsApp number -- the driver needs a
-- direct line to the customer the moment they arrive ("I'm waiting at
-- the lobby/parking area"), and the customer's account-level phone
-- number (customers.phone, set once at signup and easily stale or a
-- home-country number they're not using while traveling) isn't
-- reliable enough for that. Captured fresh on the booking form itself
-- instead, same reasoning as hotel_name/room_number already being
-- per-booking rather than per-account. Run in the Supabase SQL Editor,
-- same as earlier migrations.
alter table bookings
  add column if not exists pickup_whatsapp_number text;
