import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { sendBookingConfirmedEmail } from "@/lib/email/resend";

const PAID_STATUSES = new Set(["PAID", "SETTLED"]);
const FAILED_STATUSES = new Set(["EXPIRED", "FAILED"]);

/**
 * Xendit calls this after every invoice status change. Verified with the
 * shared token in the `x-callback-token` header (set up in the Xendit
 * dashboard alongside this URL) -- this is the only thing standing
 * between "a real payment happened" and "anyone on the internet POSTing
 * here can mark a booking paid," so it's checked before anything else.
 */
/**
 * TEMPORARY debug helper -- shows enough about a token to spot a typo,
 * stray whitespace, or a missing env var WITHOUT printing the whole
 * secret. Delete this once the webhook token mismatch is solved.
 */
function describeToken(label: string, value: string | undefined | null) {
  if (!value) return { [label]: "MISSING" };
  return {
    [label]: {
      length: value.length,
      preview: `${value.slice(0, 4)}...${value.slice(-4)}`,
      hasLeadingOrTrailingWhitespace: value !== value.trim(),
    },
  };
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-callback-token");
  if (!token || token !== process.env.XENDIT_WEBHOOK_TOKEN) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        debug: {
          ...describeToken("receivedFromXendit", token),
          ...describeToken("configuredInVercel", process.env.XENDIT_WEBHOOK_TOKEN),
        },
      },
      { status: 401 }
    );
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
    .select("id, status, product_id, customer_id, slot_date, pax_count, total_idr, booking_code")
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

    const [{ data: product }, { data: customer }] = await Promise.all([
      supabase.from("products").select("title").eq("id", booking.product_id).maybeSingle(),
      supabase.from("customers").select("name, email").eq("id", booking.customer_id).maybeSingle(),
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
      });
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

    return NextResponse.json({ ok: true });
  }

  // Any other status (e.g. PENDING) -- nothing to do yet.
  return NextResponse.json({ ok: true, note: `ignored status: ${status}` });
}
