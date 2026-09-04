"use server";

import { redirect } from "next/navigation";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAgentBankChangeConfirmEmail } from "@/lib/email/resend";

function fail(message: string): never {
  redirect(`/agent/profile?error=${encodeURIComponent(message)}`);
}

/** Phone and (for business agents) PIC details -- low-risk, so this
 * writes straight through the agent_update_contact_info RPC with no
 * confirmation step, unlike the bank account below. */
export async function updateAgentContactAction(formData: FormData) {
  const agent = await requireAgent();
  const phone = String(formData.get("phone") ?? "").trim();
  const picName = String(formData.get("pic_name") ?? "").trim();
  const picPhone = String(formData.get("pic_phone") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("agent_update_contact_info", {
    p_phone: phone || null,
    p_pic_name: agent.agent_type === "business" ? picName || null : null,
    p_pic_phone: agent.agent_type === "business" ? picPhone || null : null,
  });

  if (error) {
    fail(`Couldn't save your details: ${error.message}`);
  }

  redirect("/agent/profile?saved=1");
}

/** Stages a bank account change (agent_request_bank_change RPC) and
 * emails a confirm link to the address on file -- nothing on the
 * agent's row actually changes until that link is clicked (see
 * confirm-bank/route.ts). */
export async function requestBankChangeAction(formData: FormData) {
  const agent = await requireAgent();
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const accountNumber = String(formData.get("bank_account_number") ?? "").trim();
  const accountHolder = String(formData.get("bank_account_holder") ?? "").trim();

  if (!bankName || !accountNumber || !accountHolder) {
    fail("Bank name, account number, and account holder name are all required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: token, error } = await supabase.rpc("agent_request_bank_change", {
    p_bank_name: bankName,
    p_bank_account_number: accountNumber,
    p_bank_account_holder: accountHolder,
  });

  if (error || !token) {
    fail(`Couldn't start that change: ${error?.message ?? "please try again."}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const masked =
    accountNumber.length > 4 ? `•••• ${accountNumber.slice(-4)}` : accountNumber;

  await sendAgentBankChangeConfirmEmail({
    toEmail: agent.email,
    agentName: agent.name,
    bankName,
    maskedAccountNumber: masked,
    confirmUrl: `${siteUrl}/agent/profile/confirm-bank?token=${token}`,
  });

  redirect("/agent/profile?bank_requested=1");
}

/** Lets an agent back out of a pending bank change without waiting the
 * full 24 hours for it to expire on its own. */
export async function cancelBankChangeAction() {
  await requireAgent();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("agent_cancel_bank_change");

  if (error) {
    fail(`Couldn't cancel that request: ${error.message}`);
  }

  redirect("/agent/profile?bank_cancelled=1");
}

/** Mirrors the customer account's changePasswordAction exactly --
 * verifies the current password by actually signing in with it (Supabase
 * has no separate "check this password" endpoint) before accepting a
 * new one, so an already-logged-in browser someone else has access to
 * can't be used to lock the real agent out. */
export async function changeAgentPasswordAction(formData: FormData) {
  const agent = await requireAgent();
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  function failPassword(message: string): never {
    redirect(`/agent/profile?password_error=${encodeURIComponent(message)}`);
  }

  if (newPassword.length < 6) {
    failPassword("New password must be at least 6 characters.");
  }
  if (newPassword !== confirmPassword) {
    failPassword("New passwords don't match.");
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: agent.email,
    password: currentPassword,
  });
  if (verifyError) {
    failPassword("Current password is incorrect.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    failPassword(error.message);
  }

  redirect("/agent/profile?password_saved=1");
}
