-- Sales Agent verification documents. An agent registers as either
-- personal (selfie holding their KTP) or business (NIB/business
-- license + a PIC's name/phone/ID card) -- an admin reviews these
-- alongside the application before approving at /admin/agents.
--
-- Run in the Supabase SQL Editor.

alter table sales_agents
  add column if not exists agent_type text not null default 'personal'
    check (agent_type in ('personal', 'business')),
  add column if not exists pic_name text,
  add column if not exists pic_phone text,
  add column if not exists id_document_path text,
  add column if not exists business_document_path text;

-- agent_type/pic_name/pic_phone come from the same signUp() metadata
-- full_name/phone already used -- extend the trigger from migration
-- 0010 to capture them too. The document *paths* aren't set here: the
-- files themselves are uploaded after this trigger runs (they need the
-- new user's id first, for the storage path), via a follow-up update
-- from registerAgentAction using the service-role client.
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
    v_code := 'AGENT-' || upper(substr(md5(random()::text || new.id::text), 1, 8));
    insert into sales_agents (id, name, email, phone, referral_code, status, agent_type, pic_name, pic_phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      new.email,
      new.raw_user_meta_data->>'phone',
      v_code,
      'pending',
      coalesce(new.raw_user_meta_data->>'agent_type', 'personal'),
      new.raw_user_meta_data->>'pic_name',
      new.raw_user_meta_data->>'pic_phone'
    );
  end if;
  return new;
end;
$$;

-- Private bucket -- no public or self-serve RLS policies on
-- storage.objects at all, on purpose. With RLS enabled and zero
-- policies, every direct client request is denied by default; the
-- only way in or out is the service-role client from our own trusted
-- server code (upload during registration, signed URLs for admin
-- review), the same "server code only" pattern as the rest of this
-- app's sensitive operations.
insert into storage.buckets (id, name, public)
values ('agent-documents', 'agent-documents', false)
on conflict (id) do nothing;
