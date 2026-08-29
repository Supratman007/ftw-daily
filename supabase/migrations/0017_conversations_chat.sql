-- In-app chat (spec §6b generalized by §6c): one Conversation per
-- booking ("ask about my trip") or per agent ("ask about a product,
-- or anything else") -- not a general free-for-all inbox, always tied
-- to something specific so context (which trip, which agent) never
-- has to be re-explained. Run in the Supabase SQL Editor, same as
-- earlier migrations.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('customer_booking', 'agent_support')),
  booking_id uuid references bookings (id) on delete cascade,
  agent_id uuid references sales_agents (id) on delete cascade,
  -- Set when an agent starts a thread from a specific product card
  -- (spec §6c) -- no agent catalog view exists yet to launch that
  -- from, so this column is here for when that's built, unused for now.
  related_product_id uuid references products (id),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  -- Bumped on every new message -- what "sorted by most recently
  -- active" (spec §6c's admin inbox) actually orders by.
  updated_at timestamptz not null default now(),
  constraint conversations_kind_target_check check (
    (kind = 'customer_booking' and booking_id is not null and agent_id is null)
    or (kind = 'agent_support' and agent_id is not null and booking_id is null)
  )
);

-- Exactly one conversation, ever, per booking / per agent -- a
-- persistent thread that can be resolved and reopened (like a support
-- ticket), not a fresh one every time someone has something new to
-- say. Reopening rather than fragmenting into duplicates is the whole
-- point of scoping chat this way.
create unique index if not exists conversations_one_per_booking_idx
  on conversations (booking_id) where kind = 'customer_booking';
create unique index if not exists conversations_one_per_agent_idx
  on conversations (agent_id) where kind = 'agent_support';

create index if not exists conversations_updated_at_idx on conversations (updated_at desc);

alter table conversations enable row level security;

drop policy if exists "Customers can read their own booking conversations" on conversations;
create policy "Customers can read their own booking conversations" on conversations
  for select using (
    kind = 'customer_booking'
    and exists (select 1 from bookings b where b.id = conversations.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Customers can start their own booking conversations" on conversations;
create policy "Customers can start their own booking conversations" on conversations
  for insert with check (
    kind = 'customer_booking'
    and exists (select 1 from bookings b where b.id = conversations.booking_id and b.customer_id = auth.uid())
  );

drop policy if exists "Agents can read their own support conversation" on conversations;
create policy "Agents can read their own support conversation" on conversations
  for select using (kind = 'agent_support' and agent_id = auth.uid());

drop policy if exists "Agents can start their own support conversation" on conversations;
create policy "Agents can start their own support conversation" on conversations
  for insert with check (kind = 'agent_support' and agent_id = auth.uid());

drop policy if exists "Admins can read all conversations" on conversations;
create policy "Admins can read all conversations" on conversations
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can update conversations" on conversations;
create policy "Admins can update conversations" on conversations
  for update using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender text not null check (sender in ('customer', 'agent', 'staff')),
  -- Denormalized at send time (the sending Server Action already has
  -- this on hand) so rendering a thread never needs a second join back
  -- to customers/sales_agents/admin_users just to show who said what.
  sender_name text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on messages (conversation_id, created_at);

alter table messages enable row level security;

drop policy if exists "Customers can read messages on their own booking conversations" on messages;
create policy "Customers can read messages on their own booking conversations" on messages
  for select using (
    exists (
      select 1 from conversations c
      join bookings b on b.id = c.booking_id
      where c.id = messages.conversation_id and c.kind = 'customer_booking' and b.customer_id = auth.uid()
    )
  );

drop policy if exists "Customers can send messages on their own booking conversations" on messages;
create policy "Customers can send messages on their own booking conversations" on messages
  for insert with check (
    sender = 'customer'
    and exists (
      select 1 from conversations c
      join bookings b on b.id = c.booking_id
      where c.id = messages.conversation_id and c.kind = 'customer_booking' and b.customer_id = auth.uid()
    )
  );

drop policy if exists "Agents can read messages on their own support conversation" on messages;
create policy "Agents can read messages on their own support conversation" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.kind = 'agent_support' and c.agent_id = auth.uid()
    )
  );

drop policy if exists "Agents can send messages on their own support conversation" on messages;
create policy "Agents can send messages on their own support conversation" on messages
  for insert with check (
    sender = 'agent'
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.kind = 'agent_support' and c.agent_id = auth.uid()
    )
  );

drop policy if exists "Admins can read all messages" on messages;
create policy "Admins can read all messages" on messages
  for select using (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

drop policy if exists "Admins can send messages" on messages;
create policy "Admins can send messages" on messages
  for insert with check (
    sender = 'staff'
    and exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );

-- Bumps the parent conversation's updated_at (and reopens it if a
-- customer/agent replies to something staff had marked resolved --
-- staff replying to their own open thread is already status='open',
-- so this only ever changes anything on that specific "customer speaks
-- up again" case) whenever a message lands, in the same transaction as
-- the insert -- no separate app-side update call that could be
-- skipped or race against a concurrent message.
create or replace function touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set updated_at = now(),
      status = case when new.sender != 'staff' then 'open' else status end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_touch_conversation on messages;
create trigger on_message_touch_conversation
  after insert on messages
  for each row execute function touch_conversation_on_message();

-- Realtime: without adding the table to this publication, a client
-- subscribing via .channel().on('postgres_changes', ...) never
-- receives anything -- this is the one step that's easy to miss and
-- silently do nothing. Supabase Realtime respects each subscriber's
-- own RLS SELECT access on postgres_changes, so no separate
-- Realtime-specific policy is needed beyond what's already above.
alter publication supabase_realtime add table messages;
