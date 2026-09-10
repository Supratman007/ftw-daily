-- Two follow-ups on the customer's cancellation request form:
--
-- 1. "Give it as a gift to someone else" had no place to capture *who*
--    -- staff had to ask separately and type it in themselves when
--    approving. Adds the recipient's name and email to the request
--    itself, so it flows straight through to the admin's approve-voucher
--    form instead of being re-entered by hand.
--
-- 2. preferred_resolution (migration 0020) was a required radio with a
--    default selection -- every customer landed on "refund" whether
--    they meant to or not, which reads as demanding a refund before
--    they've even read the cancellation terms. Column was already
--    nullable, so no schema change needed there; this migration is just
--    the two new columns for (1).
--
-- Run in the Supabase SQL Editor, same as earlier migrations.

alter table cancellation_requests
  add column if not exists preferred_gift_recipient_name text,
  add column if not exists preferred_gift_recipient_email text;
