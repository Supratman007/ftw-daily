"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const { error } = await supabase.from("sales_agents").update({ status }).eq("id", agentId);

  if (error) {
    fail(error.message);
  }

  redirect("/admin/agents?updated=1");
}
