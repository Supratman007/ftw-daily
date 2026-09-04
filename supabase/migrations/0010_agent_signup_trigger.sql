-- Fixes a real race in agent registration: inserting the sales_agents
-- row from application code immediately after auth.signUp() could run
-- before that new auth.users row was visible to the separate insert
-- request, failing every time with "violates foreign key constraint
-- sales_agents_id_fkey" on a project that requires email confirmation.
-- This is a documented Supabase gotcha -- the fix Supabase itself
-- recommends is a trigger on auth.users that creates the row in the
-- SAME transaction as the signup, so it's guaranteed to already exist
-- by the time any other code can see the new user id. Run in the
-- Supabase SQL Editor.
--
-- Only fires for agent signups, not ordinary customer signups --
-- distinguished by signup_kind: "agent" in the signUp() call's
-- metadata (set by registerAgentAction).

create or replace function handle_new_agent_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if new.raw_user_meta_data->>'signup_kind' = 'agent' then
    -- 8 hex characters (16^8 =~ 4.3 billion combinations) -- no
    -- retry-on-collision loop here since a trigger can't easily ask
    -- for a do-over; the odds of ever hitting one are negligible at
    -- the scale this app operates at.
    v_code := 'AGENT-' || upper(substr(md5(random()::text || new.id::text), 1, 8));
    insert into sales_agents (id, name, email, phone, referral_code, status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      new.email,
      new.raw_user_meta_data->>'phone',
      v_code,
      'pending'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_agent on auth.users;
create trigger on_auth_user_created_agent
  after insert on auth.users
  for each row execute function handle_new_agent_signup();
