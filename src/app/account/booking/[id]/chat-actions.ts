"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateBookingConversation } from "@/lib/chat/getOrCreateConversation";
import { sendNewConversationStaffEmail } from "@/lib/email/resend";

/** Spec §6b/§6c: a customer's per-booking chat with staff. Gets or
 * creates the one persistent conversation for this booking, then sends
 * into it -- same session client both steps, RLS-scoped throughout. */
export async function sendCustomerMessageAction(bookingId: string, formData: FormData) {
  const customer = await requireCustomer(`/account/booking/${bookingId}`);
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    redirect(`/account/booking/${bookingId}`);
  }

  const supabase = await createSupabaseServerClient();

  // Confirm this booking is actually theirs before creating a
  // conversation for it -- getOrCreateBookingConversation's own INSERT
  // policy would reject it anyway, but checking first avoids a
  // needless round trip on a stale/foreign booking id.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, products(title)")
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!booking) {
    redirect(`/account/booking/${bookingId}`);
  }

  const { conversation, created } = await getOrCreateBookingConversation(supabase, bookingId);

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender: "customer",
    sender_name: customer.name,
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
          fromName: customer.name,
          contextLabel:
            (booking as unknown as { products: { title: string } | null }).products?.title ??
            "a booking",
          messageBody: body,
          inboxUrl: `${siteUrl}/admin/inbox/${conversation.id}`,
        })
      )
    );
  }

  redirect(`/account/booking/${bookingId}`);
}
