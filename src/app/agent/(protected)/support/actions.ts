"use server";

import { redirect } from "next/navigation";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateAgentSupportConversation } from "@/lib/chat/getOrCreateConversation";
import { sendNewConversationStaffEmail } from "@/lib/email/resend";

/** Spec §6c: an agent's running thread with staff -- one persistent
 * conversation per agent, not per-question. */
export async function sendAgentMessageAction(formData: FormData) {
  const agent = await requireAgent();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    redirect("/agent/support");
  }

  const supabase = await createSupabaseServerClient();
  const { conversation, created } = await getOrCreateAgentSupportConversation(supabase, agent.id);

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender: "agent",
    sender_name: agent.name,
    body,
  });

  if (created) {
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: staff } = await serviceClient
      .from("admin_users")
      .select("email")
      .eq("status", "active");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await Promise.all(
      (staff ?? []).map((admin) =>
        sendNewConversationStaffEmail({
          toEmail: admin.email,
          fromName: agent.name,
          contextLabel: "an agent support question",
          messageBody: body,
          inboxUrl: `${siteUrl}/admin/inbox/${conversation.id}`,
        })
      )
    );
  }

  redirect("/agent/support");
}
