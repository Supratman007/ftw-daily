"use server";

import { redirect } from "next/navigation";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendNewStaffReplyEmail } from "@/lib/email/resend";
import {
  getOrCreateBookingConversation,
  getOrCreateAgentSupportConversation,
} from "@/lib/chat/getOrCreateConversation";
import type { Locale } from "@/lib/i18n/locales";

/** The other half of "reply" -- staff reaching out first (spec doesn't
 * call for this explicitly, but 0017 only let admins reply to a
 * thread a customer/agent had already started, with no way to ask
 * something first, e.g. "what's your hotel/room/mobile number/pickup
 * point?"). Reuses the same get-or-create every customer/agent thread
 * already goes through -- 0018 is what actually makes this work,
 * adding the admin INSERT policy on conversations that was missing. */
export async function startCustomerConversationAction(bookingId: string) {
  await requireAdminSection("inbox");
  const supabase = await createSupabaseServerClient();
  const { conversation } = await getOrCreateBookingConversation(supabase, bookingId);
  redirect(`/admin/inbox/${conversation.id}`);
}

export async function startAgentConversationAction(agentId: string) {
  await requireAdminSection("inbox");
  const supabase = await createSupabaseServerClient();
  const { conversation } = await getOrCreateAgentSupportConversation(supabase, agentId);
  redirect(`/admin/inbox/${conversation.id}`);
}

export async function sendStaffMessageAction(conversationId: string, formData: FormData) {
  const admin = await requireAdminSection("inbox");
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
      "kind, booking_id, bookings(products(title), customers(name, email, preferred_locale)), sales_agents(name, email)"
    )
    .eq("id", conversationId)
    .maybeSingle();

  const conversation = conversationRow as unknown as {
    kind: "customer_booking" | "agent_support";
    booking_id: string | null;
    bookings: {
      products: { title: string } | null;
      customers: { name: string; email: string; preferred_locale: Locale } | null;
    } | null;
    sales_agents: { name: string; email: string } | null;
  } | null;

  if (conversation) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    if (conversation.kind === "customer_booking" && conversation.bookings?.customers) {
      const locale = conversation.bookings.customers.preferred_locale;
      const pathPrefix = locale === "id" ? "/id" : "";
      await sendNewStaffReplyEmail({
        toEmail: conversation.bookings.customers.email,
        recipientName: conversation.bookings.customers.name,
        contextLabel: conversation.bookings.products?.title ?? "your trip",
        messageBody: body,
        threadUrl: `${siteUrl}${pathPrefix}/account/booking/${conversation.booking_id}`,
        locale,
      });
    } else if (conversation.kind === "agent_support" && conversation.sales_agents) {
      // Agents stay on the English-only agent panel regardless of
      // language -- no preferred_locale to read here.
      await sendNewStaffReplyEmail({
        toEmail: conversation.sales_agents.email,
        recipientName: conversation.sales_agents.name,
        contextLabel: "your support conversation",
        messageBody: body,
        threadUrl: `${siteUrl}/agent/support`,
        locale: "en",
      });
    }
  }

  redirect(`/admin/inbox/${conversationId}`);
}

/** Staff replying already keeps a conversation 'open' (the touch
 * trigger, 0017, only ever reopens on a non-staff message); this is
 * the explicit "I've handled this" action for once a thread's done. */
export async function resolveConversationAction(conversationId: string) {
  await requireAdminSection("inbox");
  const supabase = await createSupabaseServerClient();
  await supabase.from("conversations").update({ status: "resolved" }).eq("id", conversationId);
  redirect(`/admin/inbox/${conversationId}?resolved=1`);
}

export async function reopenConversationAction(conversationId: string) {
  await requireAdminSection("inbox");
  const supabase = await createSupabaseServerClient();
  await supabase.from("conversations").update({ status: "open" }).eq("id", conversationId);
  redirect(`/admin/inbox/${conversationId}`);
}
