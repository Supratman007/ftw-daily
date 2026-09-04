-- Lets a voucher recipient say how many people they're actually
-- bringing, instead of the redeemed trip silently inheriting the
-- *original* booking's group size with no way to change it. Run in the
-- Supabase SQL Editor, same as earlier migrations.

alter table gift_vouchers
  add column if not exists requested_pax_count integer;
