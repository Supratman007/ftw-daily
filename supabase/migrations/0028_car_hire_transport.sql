-- Car Hire & Transport (spec §6a, §6e) -- the two product types that
-- have existed as a type-level placeholder since Phase 1
-- (products.product_type already allows 'car_hire'/'transport') but
-- never had real pricing or booking logic behind them. Both types
-- price by *where* the customer's picked up, not just how many people
-- -- a small pricing engine of their own, not the plain
-- adult_price_usd every other product type uses. Run in the Supabase
-- SQL Editor, same as earlier migrations.

-- Admin-managed pickup locations -- also doubles as the pricing key
-- for both Car Hire and Transport below, per spec §6e: one dropdown
-- selection does double duty as both "where" and "which price applies."
create table if not exists meeting_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table meeting_points enable row level security;

drop policy if exists "Anyone can read active meeting points" on meeting_points;
create policy "Anyone can read active meeting points" on meeting_points
  for select using (status = 'active');

drop policy if exists "Admins can read all meeting points" on meeting_points;
create policy "Admins can read all meeting points" on meeting_points
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can insert meeting points" on meeting_points;
create policy "Admins can insert meeting points" on meeting_points
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update meeting points" on meeting_points;
create policy "Admins can update meeting points" on meeting_points
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Capped at 4/6-seater only (spec §6a) -- 10-seat+ requires a licensed
-- tour guide under Indonesian park/transport regulation, out of scope
-- for a self-service car hire flow entirely, not just deferred.
create table if not exists car_types (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  capacity_tier integer not null check (capacity_tier in (4, 6)),
  image_url text,
  features text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists car_types_product_id_idx on car_types (product_id);

alter table car_types enable row level security;

drop policy if exists "Anyone can read active car types" on car_types;
create policy "Anyone can read active car types" on car_types
  for select using (status = 'active');

drop policy if exists "Admins can read all car types" on car_types;
create policy "Admins can read all car types" on car_types
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can insert car types" on car_types;
create policy "Admins can insert car types" on car_types
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update car types" on car_types;
create policy "Admins can update car types" on car_types
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete car types" on car_types;
create policy "Admins can delete car types" on car_types
  for delete using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Fixed duration packages (6/8/10h), each with its own price rather
-- than an hourly multiplier -- longer packages are usually discounted,
-- per spec. overtime_rate_per_hour is disclosed to the customer before
-- booking but settled in cash directly with the driver -- never
-- charged by the app.
create table if not exists car_packages (
  id uuid primary key default gen_random_uuid(),
  car_type_id uuid not null references car_types (id) on delete cascade,
  duration_hours integer not null check (duration_hours in (6, 8, 10)),
  overtime_rate_per_hour_idr integer not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists car_packages_car_type_id_idx on car_packages (car_type_id);

alter table car_packages enable row level security;

drop policy if exists "Anyone can read active car packages" on car_packages;
create policy "Anyone can read active car packages" on car_packages
  for select using (status = 'active');

drop policy if exists "Admins can read all car packages" on car_packages;
create policy "Admins can read all car packages" on car_packages
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can insert car packages" on car_packages;
create policy "Admins can insert car packages" on car_packages
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update car packages" on car_packages;
create policy "Admins can update car packages" on car_packages
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete car packages" on car_packages;
create policy "Admins can delete car packages" on car_packages
  for delete using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- The actual price grid: car package × starting area, manually
-- entered, never calculated. No row here for a given meeting point
-- means "not priced yet" -- the customer-facing page treats that the
-- same as picking "Other" (price confirmed by staff), not as an error.
create table if not exists car_package_prices (
  id uuid primary key default gen_random_uuid(),
  car_package_id uuid not null references car_packages (id) on delete cascade,
  meeting_point_id uuid not null references meeting_points (id) on delete cascade,
  price_idr integer not null,
  unique (car_package_id, meeting_point_id)
);

alter table car_package_prices enable row level security;

drop policy if exists "Anyone can read car package prices" on car_package_prices;
create policy "Anyone can read car package prices" on car_package_prices
  for select using (true);

drop policy if exists "Admins can insert car package prices" on car_package_prices;
create policy "Admins can insert car package prices" on car_package_prices
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update car package prices" on car_package_prices;
create policy "Admins can update car package prices" on car_package_prices
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete car package prices" on car_package_prices;
create policy "Admins can delete car package prices" on car_package_prices
  for delete using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Transport's price grid -- one row per (transport product × starting
-- area), same "manually entered, no row = not priced yet" shape as
-- car_package_prices above.
create table if not exists transport_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  meeting_point_id uuid not null references meeting_points (id) on delete cascade,
  price_idr integer not null,
  unique (product_id, meeting_point_id)
);

alter table transport_prices enable row level security;

drop policy if exists "Anyone can read transport prices" on transport_prices;
create policy "Anyone can read transport prices" on transport_prices
  for select using (true);

drop policy if exists "Admins can insert transport prices" on transport_prices;
create policy "Admins can insert transport prices" on transport_prices
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update transport prices" on transport_prices;
create policy "Admins can update transport prices" on transport_prices
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete transport prices" on transport_prices;
create policy "Admins can delete transport prices" on transport_prices
  for delete using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Booking fields shared by Car Hire and Transport (spec §6e).
-- meeting_point_id (fixed list) and meeting_point_custom ("Other" free
-- text) are mutually exclusive by convention, enforced in application
-- code rather than a check constraint -- simpler, and the app is the
-- only writer here anyway.
alter table bookings
  add column if not exists car_type_id uuid references car_types (id),
  add column if not exists car_package_id uuid references car_packages (id),
  add column if not exists pickup_datetime timestamptz,
  add column if not exists meeting_point_id uuid references meeting_points (id),
  add column if not exists meeting_point_custom text;

-- Audit trail for self-service pickup-time changes (spec §6e) -- a
-- driver dispatch depends on this being accurate, and "I never changed
-- it" needs to be resolvable. A real table, not a jsonb array on
-- bookings, matching this app's existing preference for relational
-- history over embedded blobs (cancellation_requests, gift_vouchers).
create table if not exists booking_pickup_changes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  old_datetime timestamptz not null,
  new_datetime timestamptz not null,
  changed_at timestamptz not null default now()
);

create index if not exists booking_pickup_changes_booking_id_idx on booking_pickup_changes (booking_id);

alter table booking_pickup_changes enable row level security;

drop policy if exists "Customers can read their own pickup change log" on booking_pickup_changes;
create policy "Customers can read their own pickup change log" on booking_pickup_changes
  for select using (
    exists (select 1 from bookings b where b.id = booking_pickup_changes.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Admins can read all pickup change logs" on booking_pickup_changes;
create policy "Admins can read all pickup change logs" on booking_pickup_changes
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );
