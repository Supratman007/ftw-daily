-- Discount/coupon codes, entered by the customer at checkout (§ requested
-- directly, not in the original spec). Run in the Supabase SQL Editor
-- the same way as the earlier migrations.

create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent', 'fixed_usd')),
  discount_value numeric not null check (discount_value > 0),
  -- null means no cap on total redemptions.
  max_uses integer,
  used_count integer not null default 0,
  -- null means it never expires.
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists discount_codes_code_idx on discount_codes (code);

alter table discount_codes enable row level security;

-- No public/customer SELECT policy at all, deliberately -- a customer's
-- browser should never be able to list every code that exists (that
-- defeats the point of a promo code). Checkout validates a typed code
-- through the service-role client instead (see reserve_discount_code
-- below), which bypasses RLS entirely, same pattern as the capacity
-- check in 0003_bookings.sql.

drop policy if exists "Admins can read discount codes" on discount_codes;
create policy "Admins can read discount codes" on discount_codes
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can insert discount codes" on discount_codes;
create policy "Admins can insert discount codes" on discount_codes
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update discount codes" on discount_codes;
create policy "Admins can update discount codes" on discount_codes
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- What got applied to a booking. discount_code is a plain-text snapshot
-- of what the customer typed (not just the foreign key) so the booking
-- record still shows what was used even if the code is later renamed or
-- deleted; discount_code_id is kept too for admin lookups while it
-- still exists.
alter table bookings add column if not exists discount_code_id uuid references discount_codes (id);
alter table bookings add column if not exists discount_code text;
alter table bookings add column if not exists discount_amount_usd numeric not null default 0;

-- Atomically validates a code and reserves one use of it, in a single
-- statement -- same reasoning as reserve_booking_capacity in
-- 0003_bookings.sql: two customers redeeming the last use of a
-- limited code at the same moment must not both succeed.
--
-- Returns the matching row (with its discount type/value) if the code
-- is active, unexpired, and under its use limit; returns no rows
-- otherwise. Matching is case-insensitive.
--
-- Only callable by the service role -- this runs from the checkout
-- Server Action's trusted server-side code, never called directly by a
-- customer's browser.
create or replace function reserve_discount_code(p_code text)
returns table (id uuid, discount_type text, discount_value numeric)
language plpgsql
as $$
begin
  return query
  update discount_codes
  set used_count = discount_codes.used_count + 1
  where upper(discount_codes.code) = upper(p_code)
    and discount_codes.active
    and (discount_codes.expires_at is null or discount_codes.expires_at > now())
    and (discount_codes.max_uses is null or discount_codes.used_count < discount_codes.max_uses)
  returning discount_codes.id, discount_codes.discount_type, discount_codes.discount_value;
end;
$$;

revoke execute on function reserve_discount_code(text) from public;
grant execute on function reserve_discount_code(text) to service_role;

-- The other half: gives back a use when checkout doesn't complete
-- (Xendit invoice creation/booking insert fails, or the invoice itself
-- expires) -- called from the checkout action's failure paths and the
-- webhook, mirroring release_booking_capacity.
create or replace function release_discount_code(p_discount_code_id uuid)
returns void
language plpgsql
as $$
begin
  update discount_codes
  set used_count = greatest(0, used_count - 1)
  where id = p_discount_code_id;
end;
$$;

revoke execute on function release_discount_code(uuid) from public;
grant execute on function release_discount_code(uuid) to service_role;
