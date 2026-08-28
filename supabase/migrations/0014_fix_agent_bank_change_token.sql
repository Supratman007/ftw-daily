-- Fixes "function gen_random_bytes(integer) does not exist" when
-- requesting a bank account change. gen_random_bytes comes from the
-- pgcrypto extension, which on Supabase lives in the `extensions`
-- schema, not `public` -- 0013's `set search_path = public` on this
-- function couldn't see it. gen_random_uuid() worked fine elsewhere in
-- this app (e.g. commission_tiers.id's default) only because that's a
-- plain column default evaluated under the connecting role's normal
-- search_path (which does include `extensions` on Supabase); a
-- SECURITY DEFINER function's own `set search_path` isn't affected by
-- that and has to name the schema itself. Run in the Supabase SQL
-- Editor.

create or replace function agent_request_bank_change(
  p_bank_name text,
  p_bank_account_number text,
  p_bank_account_holder text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
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
