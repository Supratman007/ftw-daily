-- Transport pricing gains a vehicle/service-type dimension (spec §6e
-- follow-up) -- previously one price per pickup area only, same as a
-- single-car product. In practice a Transport product needs to price
-- differently by vehicle (sedan vs. van) or by service tier (shared
-- vs. private speedboat, for Gili Island transfers), the same way Car
-- Hire already prices by car type. Mirrors car_types/car_package_prices
-- from 0028, just without the duration-package axis Car Hire has.
-- Run in the Supabase SQL Editor, same as earlier migrations.

create table if not exists transport_vehicle_types (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  -- Free text, not a checked tier like car_types.capacity_tier --
  -- Transport isn't limited to 4/6-seat hire cars (a van, or "Private
  -- Speedboat" for a Gili transfer, don't fit that constraint).
  capacity_note text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists transport_vehicle_types_product_id_idx on transport_vehicle_types (product_id);

alter table transport_vehicle_types enable row level security;

drop policy if exists "Anyone can read active transport vehicle types" on transport_vehicle_types;
create policy "Anyone can read active transport vehicle types" on transport_vehicle_types
  for select using (status = 'active');

drop policy if exists "Admins can read all transport vehicle types" on transport_vehicle_types;
create policy "Admins can read all transport vehicle types" on transport_vehicle_types
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can insert transport vehicle types" on transport_vehicle_types;
create policy "Admins can insert transport vehicle types" on transport_vehicle_types
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update transport vehicle types" on transport_vehicle_types;
create policy "Admins can update transport vehicle types" on transport_vehicle_types
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete transport vehicle types" on transport_vehicle_types;
create policy "Admins can delete transport vehicle types" on transport_vehicle_types
  for delete using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Backfill: any transport_prices row from before this migration (keyed
-- only by product_id + meeting_point_id) gets a "Standard" vehicle
-- type per product, so existing prices carry forward under it rather
-- than being orphaned.
insert into transport_vehicle_types (product_id, name)
select distinct product_id, 'Standard'
from transport_prices
where not exists (
  select 1 from transport_vehicle_types vt
  where vt.product_id = transport_prices.product_id and vt.name = 'Standard'
);

alter table transport_prices add column if not exists vehicle_type_id uuid references transport_vehicle_types (id) on delete cascade;

update transport_prices tp
set vehicle_type_id = vt.id
from transport_vehicle_types vt
where vt.product_id = tp.product_id and vt.name = 'Standard' and tp.vehicle_type_id is null;

alter table transport_prices alter column vehicle_type_id set not null;

alter table transport_prices drop constraint if exists transport_prices_product_id_meeting_point_id_key;
alter table transport_prices drop column if exists product_id;

alter table transport_prices add constraint transport_prices_vehicle_type_id_meeting_point_id_key
  unique (vehicle_type_id, meeting_point_id);

-- Record which vehicle/service type a Transport booking picked, same
-- reasoning as car_type_id/car_package_id on bookings already.
alter table bookings
  add column if not exists transport_vehicle_type_id uuid references transport_vehicle_types (id);
