-- Adds what the customer-facing booking path needs: customer profiles,
-- bookings themselves, and the write policies each requires. Run in the
-- Supabase SQL Editor the same way as the earlier migrations.

-- One row per customer, linked 1:1 to their Supabase Auth account --
-- mirrors admin_users' pattern. Created the first time someone reaches
-- checkout (see the checkout Server Action), not at signup, since a
-- customer can self-register without ever completing a booking.
create table if not exists customers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table customers enable row level security;

drop policy if exists "Customers can read their own row" on customers;
create policy "Customers can read their own row" on customers
  for select using (auth.uid() = id);

drop policy if exists "Customers can update their own row" on customers;
create policy "Customers can update their own row" on customers
  for update using (auth.uid() = id);

drop policy if exists "Customers can insert their own row" on customers;
create policy "Customers can insert their own row" on customers
  for insert with check (auth.uid() = id);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique not null,
  customer_id uuid not null references customers (id),
  product_id uuid not null references products (id),

  slot_date date not null,
  pax_count integer not null check (pax_count > 0),

  subtotal_usd numeric not null,
  total_usd numeric not null,
  total_idr integer not null,

  -- pending_payment: booking row exists, Xendit invoice created, no
  -- money moved yet. paid_confirmed: webhook confirmed payment. expired/
  -- cancelled: didn't complete -- kept, not deleted, so the record and
  -- the freed-up capacity both stay accounted for.
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid_confirmed', 'expired', 'cancelled')),

  xendit_invoice_id text,
  xendit_invoice_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_id_idx on bookings (customer_id);
create index if not exists bookings_status_idx on bookings (status);

alter table bookings enable row level security;

drop policy if exists "Customers can read their own bookings" on bookings;
create policy "Customers can read their own bookings" on bookings
  for select using (auth.uid() = customer_id);

drop policy if exists "Customers can create their own bookings" on bookings;
create policy "Customers can create their own bookings" on bookings
  for insert with check (auth.uid() = customer_id);

-- No customer UPDATE policy: once created, only the Xendit webhook
-- (using the service-role client, which bypasses RLS entirely) is
-- allowed to change a booking's status -- a customer marking their own
-- booking "paid" client-side would be an obvious way to skip payment.

-- No longer meaningful now that nothing syncs from WordPress.
alter table availability_slots drop column if exists wp_status;

-- Atomically checks and reserves capacity for one booking, in a single
-- database statement -- this is what spec §13 means by "capacity checks
-- and slot decrement must be atomic": two customers submitting for the
-- same last spot at the same moment must not both succeed. A single SQL
-- UPDATE with capacity_booked in its WHERE clause is what actually
-- guarantees that (Postgres serializes concurrent writes to the same
-- row); doing the same "read current count, then decide, then write" as
-- separate steps in application code would not be safe.
--
-- Returns true if the reservation succeeded, false if there wasn't
-- room. p_default_capacity is the product's capacity_per_date -- passed
-- in rather than looked up here so this function doesn't need read
-- access to products; null means unlimited, and always succeeds without
-- touching the table at all.
--
-- Only callable by the service role (see the revoke/grant below) --
-- this runs from the checkout Server Action's trusted server-side code,
-- never called directly by a customer's browser with an arbitrary pax
-- count.
create or replace function reserve_booking_capacity(
  p_product_id uuid,
  p_slot_date date,
  p_pax integer,
  p_default_capacity integer
) returns boolean
language plpgsql
as $$
declare
  v_matched integer;
begin
  if p_default_capacity is null then
    return true;
  end if;

  insert into availability_slots (product_id, slot_date, capacity_total, capacity_booked)
  values (p_product_id, p_slot_date, p_default_capacity, 0)
  on conflict (product_id, slot_date) do nothing;

  update availability_slots
  set capacity_booked = capacity_booked + p_pax,
      updated_at = now()
  where product_id = p_product_id
    and slot_date = p_slot_date
    and capacity_booked + p_pax <= capacity_total;

  get diagnostics v_matched = row_count;
  return v_matched > 0;
end;
$$;

revoke execute on function reserve_booking_capacity(uuid, date, integer, integer) from public;
grant execute on function reserve_booking_capacity(uuid, date, integer, integer) to service_role;

-- The other half of the pair: gives back a reservation when a payment
-- doesn't go through (Xendit invoice expires or fails) -- called from
-- the webhook handler. Without this, a date that never actually got
-- paid for would stay counted as booked forever.
create or replace function release_booking_capacity(
  p_product_id uuid,
  p_slot_date date,
  p_pax integer
) returns void
language plpgsql
as $$
begin
  update availability_slots
  set capacity_booked = greatest(0, capacity_booked - p_pax),
      updated_at = now()
  where product_id = p_product_id
    and slot_date = p_slot_date;
end;
$$;

revoke execute on function release_booking_capacity(uuid, date, integer) from public;
grant execute on function release_booking_capacity(uuid, date, integer) to service_role;
