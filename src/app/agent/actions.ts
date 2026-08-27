"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { sendNewAgentStaffEmail } from "@/lib/email/resend";
import type { AgentType } from "@/lib/agents/types";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5MB
const DOCUMENT_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * Self-service agent registration. The sales_agents row itself is
 * created by a database trigger on auth.users (migration 0010, extended
 * in 0011 to also capture agent_type/pic_name/pic_phone), triggered by
 * signup_kind: "agent" in this signUp() call's metadata -- it runs in
 * the same transaction as the new auth user, so by the time signUp()
 * returns the row is guaranteed to already exist.
 *
 * An earlier version inserted the row from here, immediately after
 * signUp() -- on a project that requires email confirmation, that ran
 * into a real race (the new auth.users row wasn't always visible yet
 * to that separate insert) and failed every time with "violates
 * foreign key constraint sales_agents_id_fkey". A trigger is the
 * pattern Supabase itself recommends for exactly this.
 *
 * No email-confirmation step here -- Confirm email is off project-wide
 * (Supabase's own "Confirm signup" mailer turned out to be unreliable
 * with custom SMTP, unrelated to anything in this app's config). An
 * admin reviewing the application and its uploaded documents at
 * /admin/agents is the actual gate before the referral link goes live,
 * so staff get notified by email instead of the applicant needing to
 * confirm one.
 *
 * The uploaded document(s) can't go to the private agent-documents
 * bucket until there's a user id to key the storage path on, so that
 * happens after signUp() -- via the service-role client, since a
 * brand-new agent's own session has no storage policy granting it
 * write access (the bucket has none at all, on purpose; see migration
 * 0011).
 */
export async function registerAgentAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const agentType: AgentType = formData.get("agent_type") === "business" ? "business" : "personal";
  const picName = String(formData.get("pic_name") ?? "").trim();
  const picPhone = String(formData.get("pic_phone") ?? "").trim();

  function fail(message: string): never {
    redirect(`/agent/register?type=${agentType}&error=${encodeURIComponent(message)}`);
  }

  function validateDocument(value: FormDataEntryValue | null, label: string): File {
    if (!(value instanceof File) || value.size === 0) {
      fail(`Please upload ${label}.`);
    }
    if (!(value.type in DOCUMENT_EXT_BY_MIME)) {
      fail(`${label} must be a JPG or PNG image.`);
    }
    if (value.size > MAX_DOCUMENT_BYTES) {
      fail(`${label} must be smaller than 5MB.`);
    }
    return value;
  }

  if (!name || !email || !password) {
    fail("Name, email, and password are required.");
  }
  if (password.length < 6) {
    fail("Password must be at least 6 characters.");
  }

  const idFile = validateDocument(
    formData.get("id_document"),
    agentType === "business" ? "the PIC's ID card (KTP)" : "your selfie holding your KTP"
  );

  let businessFile: File | null = null;
  if (agentType === "business") {
    if (!picName || !picPhone) {
      fail("PIC name and contact number are required for a business application.");
    }
    businessFile = validateDocument(formData.get("business_document"), "your business license (NIB)");
  }

  const supabase = await createSupabaseServerClient();
  const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone,
        signup_kind: "agent",
        agent_type: agentType,
        pic_name: agentType === "business" ? picName : null,
        pic_phone: agentType === "business" ? picPhone : null,
      },
    },
  });

  if (signUpError || !signedUp.user) {
    fail(signUpError?.message ?? "Couldn't create your account.");
  }

  const userId = signedUp.user.id;
  const serviceClient = createSupabaseServiceRoleClient();

  const idPath = `${userId}/id-document.${DOCUMENT_EXT_BY_MIME[idFile.type]}`;
  const { error: idUploadError } = await serviceClient.storage
    .from("agent-documents")
    .upload(idPath, idFile, { contentType: idFile.type });

  let businessPath: string | null = null;
  let businessUploadError = null;
  if (businessFile) {
    businessPath = `${userId}/business-document.${DOCUMENT_EXT_BY_MIME[businessFile.type]}`;
    const { error } = await serviceClient.storage
      .from("agent-documents")
      .upload(businessPath, businessFile, { contentType: businessFile.type });
    businessUploadError = error;
  }

  const uploadError = idUploadError ?? businessUploadError;
  if (uploadError) {
    fail(
      `Account created, but couldn't upload your documents: ${uploadError.message}. Please contact us and we'll help you finish.`
    );
  }

  const { error: updateError } = await serviceClient
    .from("sales_agents")
    .update({ id_document_path: idPath, business_document_path: businessPath })
    .eq("id", userId);

  if (updateError) {
    fail(`Account created, but couldn't save your documents: ${updateError.message}. Please contact us.`);
  }

  // Service role: this new agent's own session can't read admin_users
  // (RLS only allows admins to read that table).
  const [{ data: staff }, { data: agentRow }] = await Promise.all([
    serviceClient.from("admin_users").select("email").eq("status", "active"),
    serviceClient.from("sales_agents").select("referral_code").eq("id", userId).maybeSingle(),
  ]);

  await Promise.all(
    (staff ?? []).map((admin) =>
      sendNewAgentStaffEmail({
        toEmail: admin.email,
        agentName: name,
        agentEmail: email,
        agentPhone: phone || null,
        referralCode: agentRow?.referral_code ?? "—",
      })
    )
  );

  redirect("/agent");
}

export async function agentLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/agent/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/agent");
}

export async function agentLogoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/agent/login");
}
