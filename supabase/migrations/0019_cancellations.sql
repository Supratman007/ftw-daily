-- Spec §6f: cancellation, rescheduling & force majeure. A real rule
-- engine, not a case-by-case judgment call -- the refund percentage is
-- calculated automatically from days-until-departure, but a staff
-- member always reviews before anything is actually refunded (no
-- Xendit refund API call from this app -- same "money moving out is
-- manual, tracked in-app" pattern already used for commission payouts,
-- since neither is automated here). Run in the Supabase SQL Editor,
-- same as earlier migrations.

-- Admin-editable fee schedule -- "no_show / same-day is the implicit
-- 0% floor" per spec, so only the non-zero tiers need a row here;
-- resolveCancellationRefundPercent finds the highest-qualifying tier
-- and falls back to 0% when none matches, same resolution shape as
-- resolveCommissionTier.
create table if not exists cancellation_policy_tiers (
  id uuid primary key default gen_random_uuid(),
  min_days_before_departure integer not null,
  refund_percent numeric not null,
  created_at timestamptz not null default now()
);

alter table cancellation_policy_tiers enable row level security;

drop policy if exists "Anyone can read cancellation policy tiers" on cancellation_policy_tiers;
create policy "Anyone can read cancellation policy tiers" on cancellation_policy_tiers
  for select using (true);

drop policy if exists "Admins can insert cancellation policy tiers" on cancellation_policy_tiers;
create policy "Admins can insert cancellation policy tiers" on cancellation_policy_tiers
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update cancellation policy tiers" on cancellation_policy_tiers;
create policy "Admins can update cancellation policy tiers" on cancellation_policy_tiers
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can delete cancellation policy tiers" on cancellation_policy_tiers;
create policy "Admins can delete cancellation policy tiers" on cancellation_policy_tiers
  for delete using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

insert into cancellation_policy_tiers (min_days_before_departure, refund_percent)
values (1, 65), (2, 90)
on conflict do nothing;

create table if not exists cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  requested_at timestamptz not null default now(),
  path text not null check (path in ('standard', 'force_majeure')),
  -- Storage path, not a URL -- same "signed URL, generated on read"
  -- pattern as agent verification documents and Rinjani passports.
  evidence_path text,
  reason text,
  -- Standard path only -- calculated the moment the request is
  -- submitted, from days-until-departure at that instant. Null for
  -- force_majeure, since that bypasses the fee schedule entirely.
  calculated_refund_percent numeric,
  calculated_refund_amount_idr integer,
  resolution text check (resolution in ('refund', 'reschedule', 'gift_voucher', 'rejected')),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references admin_users (id),
  reviewed_at timestamptz,
  admin_notes text
);

create index if not exists cancellation_requests_booking_id_idx on cancellation_requests (booking_id);
create index if not exists cancellation_requests_status_idx on cancellation_requests (status);

alter table cancellation_requests enable row level security;

drop policy if exists "Customers can read cancellation requests on their own bookings" on cancellation_requests;
create policy "Customers can read cancellation requests on their own bookings" on cancellation_requests
  for select using (
    exists (select 1 from bookings b where b.id = cancellation_requests.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Customers can request cancellation on their own bookings" on cancellation_requests;
create policy "Customers can request cancellation on their own bookings" on cancellation_requests
  for insert with check (
    exists (select 1 from bookings b where b.id = cancellation_requests.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Admins can read all cancellation requests" on cancellation_requests;
create policy "Admins can read all cancellation requests" on cancellation_requests
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update cancellation requests" on cancellation_requests;
create policy "Admins can update cancellation requests" on cancellation_requests
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

create table if not exists gift_vouchers (
  id uuid primary key default gen_random_uuid(),
  original_booking_id uuid not null references bookings (id),
  product_id uuid not null references products (id),
  value_amount_idr integer not null,
  recipient_name text not null,
  recipient_contact text not null,
  redemption_code text not null unique,
  status text not null default 'issued' check (status in ('issued', 'redeemed', 'expired')),
  issued_at timestamptz not null default now(),
  -- 12 months per spec's own recommendation, so a voucher doesn't sit
  -- as an open-ended liability forever.
  expires_at timestamptz not null default (now() + interval '12 months')
);

create index if not exists gift_vouchers_original_booking_id_idx on gift_vouchers (original_booking_id);

alter table gift_vouchers enable row level security;

drop policy if exists "Customers can read vouchers from their own bookings" on gift_vouchers;
create policy "Customers can read vouchers from their own bookings" on gift_vouchers
  for select using (
    exists (select 1 from bookings b where b.id = gift_vouchers.original_booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Admins can read all gift vouchers" on gift_vouchers;
create policy "Admins can read all gift vouchers" on gift_vouchers
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can insert gift vouchers" on gift_vouchers;
create policy "Admins can insert gift vouchers" on gift_vouchers
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update gift vouchers" on gift_vouchers;
create policy "Admins can update gift vouchers" on gift_vouchers
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Force-majeure supporting documents (e.g. a medical note) -- same
-- "private bucket, zero RLS policies" pattern as agent-documents and
-- booking-documents: every direct client request is denied by
-- default, so the only way in or out is our own trusted server code's
-- service-role client.
insert into storage.buckets (id, name, public)
values ('cancellation-evidence', 'cancellation-evidence', false)
on conflict (id) do nothing;
