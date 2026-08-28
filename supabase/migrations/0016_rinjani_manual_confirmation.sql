-- Spec §6b: the manual-confirmation booking flow for products flagged
-- `is_bookable = false` (Mount Rinjani Trek, and anything future like
-- it) -- "Instantly bookable & payable online" was already unchecked
-- as an option on the product form, but nothing behind it actually
-- worked yet; the product page just showed a "contact us" placeholder.
-- Run in the Supabase SQL Editor, same as earlier migrations.

-- 1. Three new booking states, on top of the four instant-book already
-- has: under_review (request submitted, you're checking TNGR park
-- quota), confirmed_awaiting_payment (quota's available, payment link
-- sent, 24h countdown), declined (quota wasn't available). The
-- constraint name is discovered rather than assumed, since it's
-- whatever Postgres auto-generated back in 0003_bookings.sql.
do $$
declare
  con_name text;
begin
  select con.conname into con_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'bookings'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%pending_payment%';

  if con_name is not null then
    execute format('alter table bookings drop constraint %I', con_name);
  end if;
end $$;

alter table bookings add constraint bookings_status_check
  check (status in (
    'pending_payment', 'paid_confirmed', 'expired', 'cancelled',
    'under_review', 'confirmed_awaiting_payment', 'declined'
  ));

alter table bookings
  -- Set once you confirm availability (now() + 24h) -- what the
  -- Xendit invoice's own expiry is set to at that moment, so the
  -- existing webhook (PAID/EXPIRED) is the only thing that ever needs
  -- to look at this deadline; nothing here polls it.
  add column if not exists confirmation_deadline timestamptz,
  -- Internal only -- never selected by a customer-facing query.
  add column if not exists admin_notes text,
  -- Shown to the customer if declined.
  add column if not exists decline_reason text,
  -- Rp 290,000 x however many travelers chose park-provided insurance
  -- -- a flat IDR government/park fee, not a USD product-price
  -- component, so it's tracked separately rather than folded into
  -- subtotal_usd (which stays "product price only").
  add column if not exists insurance_total_idr integer not null default 0;

-- 2. One row per traveler on a request_confirmation booking --
-- Rinjani requires a passport and an insurance declaration for each
-- person, not just one per booking.
create table if not exists travelers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  full_name text not null,
  -- Storage path, not a URL -- same "signed URL, generated on read"
  -- pattern as agent verification documents (0011). Nullable because
  -- the row is inserted before the file finishes uploading (needs the
  -- traveler's own id for the storage path).
  passport_scan_path text,
  insurance_type text not null check (insurance_type in ('self_provided', 'park_provided')),
  insurance_number text,
  insurance_company text,
  insurance_fee_idr integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists travelers_booking_id_idx on travelers (booking_id);

alter table travelers enable row level security;

-- A customer can insert/read travelers for a booking they themselves
-- own -- mirrors "Agents can read bookings they referred" (0012)'s
-- exists-subquery-through-a-different-table pattern, so there's no
-- self-referencing-policy recursion risk.
drop policy if exists "Customers can insert travelers for their own bookings" on travelers;
create policy "Customers can insert travelers for their own bookings" on travelers
  for insert with check (
    exists (select 1 from bookings b where b.id = travelers.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Customers can read travelers on their own bookings" on travelers;
create policy "Customers can read travelers on their own bookings" on travelers
  for select using (
    exists (select 1 from bookings b where b.id = travelers.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Admins can read all travelers" on travelers;
create policy "Admins can read all travelers" on travelers
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Passport scans -- same "private bucket, zero RLS policies" pattern
-- as agent-documents (0011): with RLS enabled and no policies, every
-- direct client request is denied by default, so the only way in or
-- out is our own trusted server code's service-role client (upload at
-- request submission, signed URLs for admin review). A customer's own
-- booking detail page shows traveler names/insurance status, not the
-- scan itself -- they already have their own passport.
insert into storage.buckets (id, name, public)
values ('booking-documents', 'booking-documents', false)
on conflict (id) do nothing;
