-- Lets a super_admin manage the admin_users table itself --
-- 0002_manual_catalog.sql only gave each admin read access to their own
-- row, nothing let a super_admin view, invite, or edit others. Run in
-- the Supabase SQL Editor the same way as the earlier migrations.

drop policy if exists "Super admins can read all admin users" on admin_users;
create policy "Super admins can read all admin users" on admin_users
  for select using (
    exists (
      select 1 from admin_users au
      where au.id = auth.uid() and au.status = 'active' and au.role = 'super_admin'
    )
  );

drop policy if exists "Super admins can insert admin users" on admin_users;
create policy "Super admins can insert admin users" on admin_users
  for insert with check (
    exists (
      select 1 from admin_users au
      where au.id = auth.uid() and au.status = 'active' and au.role = 'super_admin'
    )
  );

drop policy if exists "Super admins can update admin users" on admin_users;
create policy "Super admins can update admin users" on admin_users
  for update using (
    exists (
      select 1 from admin_users au
      where au.id = auth.uid() and au.status = 'active' and au.role = 'super_admin'
    )
  );
