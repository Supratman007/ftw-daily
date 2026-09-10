-- Two follow-ups on the standalone gift-purchase flow (migration 0026):
--
-- 1. A gift purchase skipped discount codes and sales agent commission
--    entirely -- a normal booking supports both, so a gift bought
--    through an agent's referral link, or with a promo code, silently
--    got neither. Adds the same fields bookings already have.
--    Commission is computed at whatever tier the agent has *already*
--    reached through confirmed bookings (same resolveCommissionTier
--    call the webhook already makes for bookings) -- a gift purchase
--    earns commission at that rate, but doesn't itself count toward
--    reaching a higher tier. Paid out from the existing
--    /admin/commissions page, which now also lists these.
--
-- 2. There was no way to cancel/refund a gift voucher once bought --
--    not for the customer, not for you. Adds a request/approve flow
--    mirroring cancellation_requests' shape but far simpler (a
--    not-yet-redeemed voucher is either refunded in full or the
--    request is declined -- no fee schedule, since nothing about the
--    trip has happened yet). Same "money movement is a human decision,
--    the actual Xendit refund happens manually outside the app"
--    pattern as every other refund in this app.
--
-- Run in the Supabase SQL Editor, same as earlier migrations.

alter table gift_vouchers
  add column if not exists value_amount_usd numeric,
  add column if not exists discount_code_id uuid references discount_codes (id),
  add column if not exists discount_code text,
  add column if not exists discount_amount_usd numeric not null default 0,
  add column if not exists referred_by_agent_id uuid references sales_agents (id),
  add column if not exists commission_amount_usd numeric,
  add column if not exists commission_status text default 'pending'
    check (commission_status in ('pending', 'paid')),
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancellation_reason text;
