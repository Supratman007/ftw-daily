-- Gift vouchers have only ever existed as a side effect of cancelling
-- a booking (spec §6f). This adds a genuinely standalone path: buy a
-- trip as a gift straight from the product page, no existing booking
-- required, same Xendit-payment flow as a normal booking. Run in the
-- Supabase SQL Editor, same as earlier migrations.

-- original_booking_id only makes sense for a voucher that came out of
-- cancelling an existing booking -- a directly-purchased voucher has
-- no such booking, ever. purchaser_customer_id is its counterpart:
-- who bought it (only set for a direct purchase; a cancellation-
-- originated voucher's giver is reached through original_booking_id
-- instead). xendit_invoice_id/url mirror the same columns on bookings,
-- needed here for the same reason: the webhook needs a way to find the
-- record a payment belongs to.
alter table gift_vouchers
  alter column original_booking_id drop not null,
  add column if not exists purchaser_customer_id uuid references customers (id),
  add column if not exists xendit_invoice_id text,
  add column if not exists xendit_invoice_url text;

-- pending_payment: same meaning as on bookings -- invoice created,
-- nothing charged yet. The constraint name is discovered rather than
-- assumed, since it's whatever Postgres auto-generated back in
-- 0019_cancellations.sql (same reasoning as migration 0016's identical
-- treatment of the bookings status constraint).
do $$
declare
  con_name text;
begin
  select con.conname into con_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'gift_vouchers'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%issued%';

  if con_name is not null then
    execute format('alter table gift_vouchers drop constraint %I', con_name);
  end if;
end $$;

alter table gift_vouchers add constraint gift_vouchers_status_check
  check (status in ('pending_payment', 'issued', 'redeemed', 'expired'));

-- A direct purchaser needs to read their own voucher (the /gift
-- confirmation page, same "pending -> issued" polling pattern as a
-- normal booking's /confirmation page) -- the existing SELECT policy
-- only reaches a voucher through original_booking_id, which a direct
-- purchase never has.
drop policy if exists "Customers can read vouchers they purchased" on gift_vouchers;
create policy "Customers can read vouchers they purchased" on gift_vouchers
  for select using (auth.uid() = purchaser_customer_id);

-- Checkout creates the row before payment completes (mirrors how
-- startCheckoutAction inserts a pending_payment booking up front) --
-- needs an INSERT policy of its own, since the existing one only
-- covers cancellation_requests' own insert path, not this table.
drop policy if exists "Customers can purchase gift vouchers" on gift_vouchers;
create policy "Customers can purchase gift vouchers" on gift_vouchers
  for insert with check (auth.uid() = purchaser_customer_id);
