-- Spec §13's non-functional requirement: "Reliability of attribution:
-- agent commission is real money -- attribution logic needs test
-- coverage and an audit log (which booking, which agent, which
-- cookie, timestamped) so disputes are resolvable." Until now the only
-- record was bookings.referred_by_agent_id / gift_vouchers.referred_by_agent_id
-- themselves -- a single column with no history, no record of exactly
-- which referral code (the "cookie") produced that attribution, and no
-- trace if it were ever changed later.
--
-- Insert-only, on purpose: no RLS policies at all (same "server-code
-- only" pattern as page_views), and nothing in this app's own code
-- ever updates or deletes a row here once written -- see
-- src/lib/agents/referralAttribution.ts, the only thing that writes to
-- this table.
create table if not exists referral_attributions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id),
  gift_voucher_id uuid references gift_vouchers (id),
  agent_id uuid not null references sales_agents (id),
  -- The literal referral-cookie value at the moment of attribution --
  -- kept even though sales_agents.referral_code is the same value
  -- today, since a code could theoretically be reassigned later and
  -- this row should still show exactly what the visitor's cookie said.
  referral_code text not null,
  created_at timestamptz not null default now(),
  constraint referral_attributions_one_source check (
    (booking_id is not null) <> (gift_voucher_id is not null)
  )
);

create index if not exists referral_attributions_agent_id_idx on referral_attributions (agent_id);
create index if not exists referral_attributions_booking_id_idx on referral_attributions (booking_id);
create index if not exists referral_attributions_gift_voucher_id_idx on referral_attributions (gift_voucher_id);

alter table referral_attributions enable row level security;
