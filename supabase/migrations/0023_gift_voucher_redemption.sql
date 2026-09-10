-- Closes a real gap: the voucher email told the recipient to "contact
-- us" with no channel to actually do that, and there was no way for
-- anyone -- recipient or staff -- to record a redemption at all. Adds
-- a public redemption flow: the recipient visits /redeem?code=...
-- (no account needed, since they were never a customer), submits their
-- contact info and a preferred date, and it lands in an admin queue.
-- Actually creating the new booking and marking the voucher redeemed
-- stays a manual admin step -- same "money/booking creation is a
-- human decision, tracked in-app" pattern used everywhere else
-- (commission payouts, cancellation refunds). Run in the Supabase SQL
-- Editor, same as earlier migrations.

alter table gift_vouchers
  add column if not exists redeemed_by_name text,
  add column if not exists redeemed_by_email text,
  add column if not exists redeemed_by_phone text,
  add column if not exists requested_slot_date date,
  add column if not exists redemption_message text,
  add column if not exists redemption_requested_at timestamptz;
