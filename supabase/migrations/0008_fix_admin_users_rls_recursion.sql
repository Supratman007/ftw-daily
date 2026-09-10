-- Fixes a login-breaking bug introduced by 0007: its super_admin
-- policies on admin_users checked "is this user a super_admin?" with a
-- subquery on admin_users itself, from within a policy attached to
-- admin_users. Postgres can't resolve that -- evaluating the policy
-- requires re-evaluating the same policy -- and raises "infinite
-- recursion detected in policy for relation admin_users". The app
-- swallows that as "no admin row found" and signs the user out, which is
-- why even an existing, working super_admin account started seeing
-- "That account isn't set up as an admin" right after 0007 was applied.
--
-- Fix: do the self-check inside a SECURITY DEFINER function. It runs
-- with the function owner's privileges, bypassing RLS internally, so
-- checking "is this user a super_admin" no longer re-triggers the
-- policies on admin_users. Run this in the Supabase SQL Editor.

create or replace function is_active_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid() and status = 'active' and role = 'super_admin'
  );
$$;

revoke all on function is_active_super_admin() from public;
grant execute on function is_active_super_admin() to authenticated;

drop policy if exists "Super admins can read all admin users" on admin_users;
create policy "Super admins can read all admin users" on admin_users
  for select using (is_active_super_admin());

drop policy if exists "Super admins can insert admin users" on admin_users;
create policy "Super admins can insert admin users" on admin_users
  for insert with check (is_active_super_admin());

drop policy if exists "Super admins can update admin users" on admin_users;
create policy "Super admins can update admin users" on admin_users
  for update using (is_active_super_admin());
