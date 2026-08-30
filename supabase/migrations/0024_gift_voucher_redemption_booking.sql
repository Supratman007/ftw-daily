-- Closes the loop on gift voucher redemption: previously "Mark
-- redeemed" just flipped a status flag with nothing else happening --
-- no confirmation email, and nothing for the recipient to actually see
-- or message us about, even after they created an account. Adds the
-- link from a voucher to the real booking created for the recipient
-- once redemption is confirmed, so /account/booking/[id] (with its
-- existing chat panel) becomes their trip's home the same as any other
-- customer's. Run in the Supabase SQL Editor, same as earlier
-- migrations.

alter table gift_vouchers
  add column if not exists redeemed_booking_id uuid references bookings (id);
