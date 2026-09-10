-- Sales Agent Stage 4: lets an admin actually manage commissions --
-- edit tier rates (commission_tiers already had admin write policies
-- from 0009, nothing new needed there) and mark a referred booking's
-- commission as paid once the manual bank transfer has gone out.
-- Bookings had no admin UPDATE policy at all yet (0005 only gave
-- admins SELECT) -- every write to `bookings` until now came from the
-- Xendit webhook's service-role client. "Mark commission paid" is the
-- first admin-initiated write, so it needs its own policy, mirroring
-- the same "any active admin" pattern already used for sales_agents.
-- Run in the Supabase SQL Editor, same as earlier migrations.

drop policy if exists "Admins can update bookings" on bookings;
create policy "Admins can update bookings" on bookings
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );
