"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAgentApprovedEmail } from "@/lib/email/resend";
import type { AgentStatus } from "@/lib/agents/types";

const STATUSES: AgentStatus[] = ["pending", "active", "suspended"];

/** Approving/suspending an agent is operational work, not account/role
 * management -- any active admin can do it, unlike Team management
 * which requireSuperAdmin() gates. */
export async function updateAgentStatusAction(agentId: string, formData: FormData) {
  await requireAdmin();

  const status = String(formData.get("status") ?? "");

  function fail(message: string): never {
    redirect(`/admin/agents?error=${encodeURIComponent(message)}`);
  }

  if (!STATUSES.includes(status as AgentStatus)) {
    fail("Invalid status.");
  }

  const supabase = await createSupabaseServerClient();

  // Fetch the current row first so we know whether this is actually a
  // pending -> active transition (the moment to notify them) rather
  // than, say, re-saving an already-active agent or approving twice.
  const { data: before } = await supabase
    .from("sales_agents")
    .select("status, name, email, referral_code")
    .eq("id", agentId)
    .maybeSingle();

  const { error } = await supabase.from("sales_agents").update({ status }).eq("id", agentId);

  if (error) {
    fail(error.message);
  }

  if (before && before.status !== "active" && status === "active") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendAgentApprovedEmail({
      toEmail: before.email,
      agentName: before.name,
      referralCode: before.referral_code,
      referralLink: `${siteUrl}/?ref=${before.referral_code}`,
      dashboardUrl: `${siteUrl}/agent`,
    });
  }

  redirect("/admin/agents?updated=1");
}
