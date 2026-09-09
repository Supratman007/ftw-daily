-- Adds a timestamp for when a purchased gift voucher's refund was
-- approved. Needed for /admin/reports (Financial reports, spec §6k) to
-- count "refunds in this date range" accurately -- without it there
-- was no way to tell a refunded voucher apart from one that simply
-- expired on its own, or to know *when* the refund happened. Both
-- share status = 'expired' (a deliberate simplification from migration
-- 0027) -- this adds a column rather than a new status value, so
-- nothing that already checks status === 'expired' needs to change.
-- Run in the Supabase SQL Editor, same as earlier migrations.

alter table gift_vouchers
  add column if not exists refunded_at timestamptz;
