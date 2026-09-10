-- Admins currently have no way to see bookings anywhere in the app --
-- 0003_bookings.sql only gave customers read access to their own rows.
-- This adds the missing admin read policies, mirroring the admin
-- policies already on products/discount_codes. Run in the Supabase SQL
-- Editor the same way as the earlier migrations.

drop policy if exists "Admins can read all bookings" on bookings;
create policy "Admins can read all bookings" on bookings
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can read all customers" on customers;
create policy "Admins can read all customers" on customers
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );
