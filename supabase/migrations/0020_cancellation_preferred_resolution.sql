-- Spec §6f follow-up: the customer's own request form only asked "why"
-- (standard vs. force majeure, with a free-text reason) and left "what
-- outcome do you want" entirely implicit -- staff had to infer refund
-- vs. reschedule vs. gift-transfer from the reason text. Adds an
-- explicit preference the customer picks up front, so it shows up on
-- the review queue instead of staff guessing. It's a preference, not a
-- binding choice -- admins still decide the actual resolution (the
-- existing approve* actions and their path rules are unchanged), this
-- just tells them what the customer asked for. Run in the Supabase SQL
-- Editor, same as earlier migrations.

alter table cancellation_requests
  add column if not exists preferred_resolution text
    check (preferred_resolution in ('refund', 'reschedule', 'gift_voucher'));
