-- Founder-editable site settings -- starts with just the USD->IDR
-- exchange rate, previously a hardcoded constant in
-- src/lib/currency.ts that only a developer could change by editing
-- code and redeploying. One singleton row (id is always `true`,
-- enforced by the primary key being boolean, same trick used
-- elsewhere for "there's only ever one of these") rather than a
-- generic key/value table -- there's only this one setting today, and
-- a real numeric column catches a typo ('seventeen thousand') at
-- write time in a way a generic text value column wouldn't. Run in
-- the Supabase SQL Editor, same as every other migration here.
create table if not exists app_settings (
  id boolean primary key default true check (id),
  usd_to_idr_rate numeric not null default 17000 check (usd_to_idr_rate > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users (id)
);

insert into app_settings (id, usd_to_idr_rate)
values (true, 17000)
on conflict (id) do nothing;

alter table app_settings enable row level security;

-- Public read: every USD->IDR price shown on the public site (product
-- pages, homepage, checkout) converts at render/checkout time and
-- needs this even for a signed-out visitor -- same "Anyone can read"
-- policy commission_tiers already has (migration 0009) for the same
-- reason.
drop policy if exists "Anyone can read app settings" on app_settings;
create policy "Anyone can read app settings" on app_settings
  for select using (true);

-- Only an active admin can change it -- same "any active admin"
-- pattern as commission_tiers and every other admin-writable setting
-- in this app. The app layer (requireAdminSection("settings")) then
-- narrows that further to Super Admin only, same as commission tiers.
drop policy if exists "Admins can update app settings" on app_settings;
create policy "Admins can update app settings" on app_settings
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );
