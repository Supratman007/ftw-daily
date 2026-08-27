-- Sales Agent referral/commission system, Stage 1: the agent identity
-- itself (self-registration + admin approval) and the commission-tier
-- table agents will be rated against once Stage 2 starts crediting
-- referrals. Run in the Supabase SQL Editor, same as earlier
-- migrations.

create table if not exists sales_agents (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  referral_code text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table sales_agents enable row level security;

-- An agent needs to see their own row (status, referral code) right
-- after registering, before any admin has approved them.
drop policy if exists "Agents can read their own row" on sales_agents;
create policy "Agents can read their own row" on sales_agents
  for select using (auth.uid() = id);

-- Self-registration creates this row right after auth.signUp(), same
-- pattern as "Customers can insert their own row" in 0003_bookings.sql.
-- Requiring status = 'pending' here (not just auth.uid() = id) means
-- nobody can self-approve by calling the API directly with their own
-- JWT instead of going through the app's registration form.
drop policy if exists "Agents can insert their own row" on sales_agents;
create policy "Agents can insert their own row" on sales_agents
  for insert with check (auth.uid() = id and status = 'pending');

-- Any active admin can review and approve/suspend agents -- not
-- restricted to super_admin, matching bookings/products (operational
-- work, not account/role management like the Team screen).
drop policy if exists "Admins can read all sales agents" on sales_agents;
create policy "Admins can read all sales agents" on sales_agents
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update sales agents" on sales_agents;
create policy "Admins can update sales agents" on sales_agents
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Commission rate an agent earns once their lifetime confirmed
-- referral count reaches min_referrals. No PII here, so open read
-- (also lets a future public "become an agent" page show the tiers) --
-- writes are admin-only.
create table if not exists commission_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_referrals integer not null default 0,
  commission_percent numeric not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table commission_tiers enable row level security;

drop policy if exists "Anyone can read commission tiers" on commission_tiers;
create policy "Anyone can read commission tiers" on commission_tiers
  for select using (true);

drop policy if exists "Admins can insert commission tiers" on commission_tiers;
create policy "Admins can insert commission tiers" on commission_tiers
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update commission tiers" on commission_tiers;
create policy "Admins can update commission tiers" on commission_tiers
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete commission tiers" on commission_tiers;
create policy "Admins can delete commission tiers" on commission_tiers
  for delete using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

insert into commission_tiers (name, min_referrals, commission_percent, sort_order)
values
  ('Starter', 0, 5, 0),
  ('Growth', 10, 8, 1),
  ('Elite', 25, 12, 2)
on conflict do nothing;

-- Stage 2 wires these up at checkout/payment-confirmation time; adding
-- the columns now keeps this one migration self-contained.
alter table bookings
  add column if not exists referred_by_agent_id uuid references sales_agents (id),
  add column if not exists commission_amount_usd numeric,
  add column if not exists commission_status text default 'pending'
    check (commission_status in ('pending', 'paid'));
