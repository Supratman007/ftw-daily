-- Customer reviews (spec §6d): a star rating + written review per
-- completed booking, published immediately for 4-5 stars, held for
-- admin moderation at 3 stars or below. Sent out by a scheduled job
-- (Vercel Cron, see /api/cron/review-requests) the day a trip ends.
--
-- Deviates from the original spec's exact schema in one place worth
-- calling out: the review-invitation token lives on `bookings`, not on
-- `reviews`, since a Review row only actually exists once a customer
-- submits one -- there's no "review" yet at the moment the invite
-- email goes out, just a booking that's earned an invite. Simpler than
-- adding a fourth review status just to represent "invited, not
-- submitted yet".
--
-- Run in the Supabase SQL Editor, same as earlier migrations.

-- A structured trip length, alongside the existing free-text
-- duration_label -- needed to compute a multi-day trip's actual last
-- day (service_end_date below), which duration_label ("3 Days 2
-- Nights") can't be parsed reliably for. Defaults to 1 (a single-day
-- trip) for every existing product.
alter table products add column if not exists duration_days integer not null default 1;
alter table products drop constraint if exists products_duration_days_check;
alter table products add constraint products_duration_days_check check (duration_days >= 1);

alter table bookings add column if not exists service_end_date date;
alter table bookings add column if not exists review_token text unique;
alter table bookings add column if not exists review_token_expires_at timestamptz;
-- Doubles as the cron job's dedupe flag -- set the moment the
-- invitation email is sent, so a booking never gets the same email
-- twice even if the job runs more than once on the same day.
alter table bookings add column if not exists review_requested_at timestamptz;
alter table bookings add column if not exists review_token_used_at timestamptz;

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  -- One review per booking, not per customer (spec §6d) -- someone who
  -- books the same tour twice can review it twice, once per trip.
  booking_id uuid not null unique references bookings (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  status text not null default 'pending_moderation'
    check (status in ('published', 'pending_moderation', 'rejected')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists reviews_product_id_idx on reviews (product_id);
create index if not exists reviews_status_idx on reviews (status);

alter table reviews enable row level security;

drop policy if exists "Anyone can read published reviews" on reviews;
create policy "Anyone can read published reviews" on reviews
  for select using (status = 'published');

drop policy if exists "Customers can read reviews on their own bookings" on reviews;
create policy "Customers can read reviews on their own bookings" on reviews
  for select using (
    exists (select 1 from bookings b where b.id = reviews.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Admins can read all reviews" on reviews;
create policy "Admins can read all reviews" on reviews
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update reviews" on reviews;
create policy "Admins can update reviews" on reviews
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- No insert policy for anon/authenticated on purpose -- review
-- submission goes through the token-verified server action using the
-- service-role client (same "customer-triggered write, no matching
-- RLS policy, service role only" pattern used throughout this app),
-- since the reviewer isn't necessarily logged in when they submit.
