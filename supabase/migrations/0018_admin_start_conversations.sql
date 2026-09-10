-- Lets staff start a conversation themselves, not just reply to one a
-- customer or agent already began -- 0017 only gave admins SELECT and
-- UPDATE on conversations (reply/resolve/reopen), no INSERT at all,
-- so there was genuinely no way to reach out first (e.g. "what's your
-- hotel/room/mobile number/pickup point?" before a customer has asked
-- anything). Run in the Supabase SQL Editor, same as earlier
-- migrations.

drop policy if exists "Admins can start conversations" on conversations;
create policy "Admins can start conversations" on conversations
  for insert with check (
    exists (select 1 from admin_users au where au.id = auth.uid() and au.status = 'active')
  );
