-- Stage 3 of the Sales Agent system: the agent-facing dashboard needs
-- to read its own referred bookings and the customers on them, neither
-- of which any existing policy grants (bookings only lets a customer
-- read their own row or an admin read everything; customers is the
-- same). Scoped narrowly -- an agent sees a booking only if it credits
-- them, and a customer only if they're on a booking that does.
--
-- Run in the Supabase SQL Editor.

drop policy if exists "Agents can read bookings they referred" on bookings;
create policy "Agents can read bookings they referred" on bookings
  for select using (referred_by_agent_id = auth.uid());

drop policy if exists "Agents can read customers they referred" on customers;
create policy "Agents can read customers they referred" on customers
  for select using (
    exists (
      select 1 from bookings b
      where b.customer_id = customers.id and b.referred_by_agent_id = auth.uid()
    )
  );
