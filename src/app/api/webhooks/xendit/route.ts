import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import {
  sendBookingConfirmedEmail,
  sendNewBookingStaffEmail,
  sendPaymentFailedEmail,
} from "@/lib/email/resend";

const PAID_STATUSES = new Set(["PAID", "SETTLED"]);
const FAILED_STATUSES = new Set(["EXPIRED", "FAILED"]);

/**
 * Xendit calls this after every invoice status change. Verified with the
 * shared token in the `x-callback-token` header (set up in the Xendit
 * dashboard alongside this URL) -- this is the only thing standing
 * between "a real payment happened" and "anyone on the internet POSTing
 * here can mark a booking paid," so it's checked before anything else.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("x-callback-token");
  if (!token || token !== process.env.XENDIT_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const externalId: string | undefined = payload.external_id;
  const status: string | undefined = payload.status;

  if (!externalId || !status) {
    // Not a shape we recognize -- acknowledge so Xendit doesn't retry
    // forever, but there's nothing to act on.
    return NextResponse.json({ ok: true, note: "ignored: missing external_id/status" });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, product_id, customer_id, slot_date, pax_count, total_idr, total_usd, booking_code, discount_code_id, discount_code, discount_amount_usd, referred_by_agent_id"
    )
    .eq("booking_code", externalId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ ok: true, note: "ignored: no matching booking" });
  }

  // Webhooks can and do retry -- already-processed bookings are a
  // no-op, not an error, so a duplicate delivery doesn't send a second
  // confirmation email or try to release capacity twice.
  if (booking.status !== "pending_payment") {
    return NextResponse.json({ ok: true, note: "already processed" });
  }

  if (PAID_STATUSES.has(status)) {
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "paid_confirmed", updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (booking.referred_by_agent_id) {
      // The rate an agent earns climbs with volume -- rated against
      // how many of their referrals were *already* confirmed before
      // this one, not counting this booking itself, so the tier they
      // qualify for only ever reflects completed history.
      const [{ count: priorConfirmedCount }, { data: tiers }] = await Promise.all([
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("referred_by_agent_id", booking.referred_by_agent_id)
          .eq("status", "paid_confirmed")
          .neq("id", booking.id),
        supabase
          .from("commission_tiers")
          .select("min_referrals, commission_percent")
          .order("min_referrals", { ascending: false }),
      ]);

      const tier = (tiers ?? []).find((t) => (priorConfirmedCount ?? 0) >= t.min_referrals);
      if (tier) {
        await supabase
          .from("bookings")
          .update({ commission_amount_usd: booking.total_usd * (tier.commission_percent / 100) })
          .eq("id", booking.id);
      }
    }

    const [{ data: product }, { data: customer }, { data: staff }] = await Promise.all([
      supabase.from("products").select("title").eq("id", booking.product_id).maybeSingle(),
      supabase
        .from("customers")
        .select("name, email, phone")
        .eq("id", booking.customer_id)
        .maybeSingle(),
      // Everyone active gets it for now -- Phase 1 hasn't enforced the
      // narrower admin roles from spec §6k yet, so there's no
      // "reservations" vs "accounting" distinction to filter on.
      supabase.from("admin_users").select("email").eq("status", "active"),
    ]);

    if (product && customer) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await sendBookingConfirmedEmail({
        toEmail: customer.email,
        customerName: customer.name,
        productTitle: product.title,
        slotDate: booking.slot_date,
        paxCount: booking.pax_count,
        totalIdr: booking.total_idr,
        bookingCode: booking.booking_code,
        bookingUrl: `${siteUrl}/confirmation/${booking.id}`,
        discountCode: booking.discount_code,
        discountAmountUsd: booking.discount_amount_usd,
      });

      await Promise.all(
        (staff ?? []).map((admin) =>
          sendNewBookingStaffEmail({
            toEmail: admin.email,
            productTitle: product.title,
            slotDate: booking.slot_date,
            paxCount: booking.pax_count,
            totalIdr: booking.total_idr,
            bookingCode: booking.booking_code,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
          })
        )
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (FAILED_STATUSES.has(status)) {
    await supabase
      .from("bookings")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    await supabase.rpc("release_booking_capacity", {
      p_product_id: booking.product_id,
      p_slot_date: booking.slot_date,
      p_pax: booking.pax_count,
    });

    if (booking.discount_code_id) {
      await supabase.rpc("release_discount_code", {
        p_discount_code_id: booking.discount_code_id,
      });
    }

    const [{ data: product }, { data: customer }] = await Promise.all([
      supabase.from("products").select("title, slug").eq("id", booking.product_id).maybeSingle(),
      supabase.from("customers").select("name, email").eq("id", booking.customer_id).maybeSingle(),
    ]);

    if (product && customer) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await sendPaymentFailedEmail({
        toEmail: customer.email,
        customerName: customer.name,
        productTitle: product.title,
        slotDate: booking.slot_date,
        bookingCode: booking.booking_code,
        productUrl: `${siteUrl}/p/${product.slug}`,
      });
    }

    return NextResponse.json({ ok: true });
  }

  // Any other status (e.g. PENDING) -- nothing to do yet.
  return NextResponse.json({ ok: true, note: `ignored status: ${status}` });
}
