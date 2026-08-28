-- Agent Profile tab (spec §6l/§6j): contact/PIC details (editable
-- immediately) and a bank account for manual commission payout
-- (editable only through a request+email-confirm flow, since
-- redirecting someone's payout destination is exactly the kind of
-- mistake -- or fraud vector -- worth a speed bump for). Both are
-- exposed as SECURITY DEFINER RPC functions rather than a direct RLS
-- UPDATE policy on sales_agents -- keeps an agent from ever being able
-- to write status/agent_type/referral_code/documents themselves, same
-- reasoning that moved registration itself into a trigger
-- (0010_agent_signup_trigger.sql) instead of an app-side insert. Run
-- in the Supabase SQL Editor, same as earlier migrations.

alter table sales_agents
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_holder text,
  add column if not exists pending_bank_name text,
  add column if not exists pending_bank_account_number text,
  add column if not exists pending_bank_account_holder text,
  add column if not exists bank_change_token text,
  add column if not exists bank_change_requested_at timestamptz;

-- Contact/PIC details -- low-risk, no confirmation step needed.
create or replace function agent_update_contact_info(
  p_phone text,
  p_pic_name text,
  p_pic_phone text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sales_agents
  set phone = p_phone,
      pic_name = p_pic_name,
      pic_phone = p_pic_phone
  where id = auth.uid();
end;
$$;

grant execute on function agent_update_contact_info(text, text, text) to authenticated;

-- Stages a bank account change and returns a one-time token; the app
-- emails a confirm link containing it to the address on file. Nothing
-- in bank_name/bank_account_number/bank_account_holder actually
-- changes until agent_confirm_bank_change is called with this exact
-- token, and only within 24 hours -- an old, unused request can't be
-- replayed later.
create or replace function agent_request_bank_change(
  p_bank_name text,
  p_bank_account_number text,
  p_bank_account_holder text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  v_token := encode(gen_random_bytes(24), 'hex');
  update sales_agents
  set pending_bank_name = p_bank_name,
      pending_bank_account_number = p_bank_account_number,
      pending_bank_account_holder = p_bank_account_holder,
      bank_change_token = v_token,
      bank_change_requested_at = now()
  where id = auth.uid();
  return v_token;
end;
$$;

grant execute on function agent_request_bank_change(text, text, text) to authenticated;

-- Applies a staged bank account change once the agent clicks the
-- emailed confirm link (while logged in as themselves). Returns false
-- for a wrong, already-used, or expired token rather than raising, so
-- the app can show a plain "this link has expired" message instead of
-- a hard error.
create or replace function agent_confirm_bank_change(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update sales_agents
  set bank_name = pending_bank_name,
      bank_account_number = pending_bank_account_number,
      bank_account_holder = pending_bank_account_holder,
      pending_bank_name = null,
      pending_bank_account_number = null,
      pending_bank_account_holder = null,
      bank_change_token = null,
      bank_change_requested_at = null
  where id = auth.uid()
    and bank_change_token = p_token
    and bank_change_requested_at > now() - interval '24 hours'
  returning id into v_id;

  return v_id is not null;
end;
$$;

grant execute on function agent_confirm_bank_change(text) to authenticated;

-- Lets an agent back out of a pending bank change without waiting the
-- full 24 hours for the token to expire on its own.
create or replace function agent_cancel_bank_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sales_agents
  set pending_bank_name = null,
      pending_bank_account_number = null,
      pending_bank_account_holder = null,
      bank_change_token = null,
      bank_change_requested_at = null
  where id = auth.uid();
end;
$$;

grant execute on function agent_cancel_bank_change() to authenticated;
