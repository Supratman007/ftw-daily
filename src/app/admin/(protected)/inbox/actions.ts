"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendNewStaffReplyEmail } from "@/lib/email/resend";

export async function sendStaffMessageAction(conversationId: string, formData: FormData) {
  const admin = await requireAdmin();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    redirect(`/admin/inbox/${conversationId}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender: "staff",
    sender_name: admin.name || admin.email,
    body,
  });

  if (error) {
    redirect(`/admin/inbox/${conversationId}?error=${encodeURIComponent(error.message)}`);
  }

  // Let the person on the other side know a reply landed -- without
  // this, someone who messaged and closed the tab would only find out
  // by happening to come back and check.
  const { data: conversationRow } = await supabase
    .from("conversations")
    .select(
      "kind, booking_id, bookings(products(title), customers(name, email)), sales_agents(name, email)"
    )
    .eq("id", conversationId)
    .maybeSingle();

  const conversation = conversationRow as unknown as {
    kind: "customer_booking" | "agent_support";
    booking_id: string | null;
    bookings: { products: { title: string } | null; customers: { name: string; email: string } | null } | null;
    sales_agents: { name: string; email: string } | null;
  } | null;

  if (conversation) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    if (conversation.kind === "customer_booking" && conversation.bookings?.customers) {
      await sendNewStaffReplyEmail({
        toEmail: conversation.bookings.customers.email,
        recipientName: conversation.bookings.customers.name,
        contextLabel: conversation.bookings.products?.title ?? "your trip",
        messageBody: body,
        threadUrl: `${siteUrl}/account/booking/${conversation.booking_id}`,
      });
    } else if (conversation.kind === "agent_support" && conversation.sales_agents) {
      await sendNewStaffReplyEmail({
        toEmail: conversation.sales_agents.email,
        recipientName: conversation.sales_agents.name,
        contextLabel: "your support conversation",
        messageBody: body,
        threadUrl: `${siteUrl}/agent/support`,
      });
    }
  }

  redirect(`/admin/inbox/${conversationId}`);
}

/** Staff replying already keeps a conversation 'open' (the touch
 * trigger, 0017, only ever reopens on a non-staff message); this is
 * the explicit "I've handled this" action for once a thread's done. */
export async function resolveConversationAction(conversationId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  await supabase.from("conversations").update({ status: "resolved" }).eq("id", conversationId);
  redirect(`/admin/inbox/${conversationId}?resolved=1`);
}

export async function reopenConversationAction(conversationId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  await supabase.from("conversations").update({ status: "open" }).eq("id", conversationId);
  redirect(`/admin/inbox/${conversationId}`);
}
