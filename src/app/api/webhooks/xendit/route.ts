import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { resolveCommissionTier } from "@/lib/agents/commission";
import {
  sendBookingConfirmedEmail,
  sendNewBookingStaffEmail,
  sendPaymentFailedEmail,
  sendGiftVoucherPurchaseConfirmedEmail,
  sendNewGiftVoucherPurchaseStaffEmail,
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
      "id, status, product_id, customer_id, slot_date, pax_count, total_idr, total_usd, booking_code, discount_code_id, discount_code, discount_amount_usd, referred_by_agent_id, pickup_datetime, meeting_point_id, meeting_point_custom, car_type_id, car_package_id, transport_vehicle_type_id, pickup_whatsapp_number, passenger_name, flight_details"
    )
    .eq("booking_code", externalId)
    .maybeSingle();

  if (!booking) {
    return handleGiftVoucherWebhook(supabase, externalId, status);
  }

  // Webhooks can and do retry -- already-processed bookings are a
  // no-op, not an error, so a duplicate delivery doesn't send a second
  // confirmation email or try to release capacity twice.
  // confirmed_awaiting_payment is the Rinjani-style equivalent of
  // pending_payment (spec §6b) -- an invoice exists and hasn't been
  // resolved yet, just reached via the manual-confirmation flow
  // instead of instant checkout; everything below treats them the same.
  if (booking.status !== "pending_payment" && booking.status !== "confirmed_awaiting_payment") {
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
          .select("id, name, min_referrals, commission_percent, sort_order"),
      ]);

      const tier = resolveCommissionTier(tiers ?? [], priorConfirmedCount ?? 0);
      if (tier) {
        await supabase
          .from("bookings")
          .update({ commission_amount_usd: booking.total_usd * (tier.commission_percent / 100) })
          .eq("id", booking.id);
      }
    }

    const pickupNote = await buildPickupNote(supabase, booking);

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
        pickupNote,
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
            pickupNote,
            pickupWhatsappNumber: booking.pickup_whatsapp_number,
            passengerName: booking.passenger_name,
            flightDetails: booking.flight_details,
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

/**
 * Builds the one-line pickup summary used in both the customer and
 * staff confirmation emails -- null for every product type that isn't
 * Car Hire/Transport (spec §6a/§6e), since only those set
 * pickup_datetime at all.
 */
async function buildPickupNote(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  booking: {
    pickup_datetime: string | null;
    meeting_point_id: string | null;
    meeting_point_custom: string | null;
    car_type_id: string | null;
    car_package_id: string | null;
    transport_vehicle_type_id: string | null;
  }
): Promise<string | null> {
  if (!booking.pickup_datetime) return null;

  const [meetingPointName, carDetail, vehicleDetail] = await Promise.all([
    booking.meeting_point_id
      ? supabase
          .from("meeting_points")
          .select("name")
          .eq("id", booking.meeting_point_id)
          .maybeSingle()
          .then((r) => r.data?.name ?? null)
      : Promise.resolve<string | null>(null),
    booking.car_type_id && booking.car_package_id
      ? Promise.all([
          supabase.from("car_types").select("name").eq("id", booking.car_type_id).maybeSingle(),
          supabase
            .from("car_packages")
            .select("duration_hours")
            .eq("id", booking.car_package_id)
            .maybeSingle(),
        ]).then(([carType, carPackage]) =>
          carType.data
            ? `${carType.data.name}${carPackage.data ? `, ${carPackage.data.duration_hours}h` : ""}`
            : null
        )
      : Promise.resolve<string | null>(null),
    booking.transport_vehicle_type_id
      ? supabase
          .from("transport_vehicle_types")
          .select("name")
          .eq("id", booking.transport_vehicle_type_id)
          .maybeSingle()
          .then((r) => r.data?.name ?? null)
      : Promise.resolve<string | null>(null),
  ]);

  const when = new Date(booking.pickup_datetime).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const whereParts = [meetingPointName, booking.meeting_point_custom].filter(Boolean);
  const where = whereParts.length > 0 ? ` from ${whereParts.join(", ")}` : "";
  const car = carDetail ?? vehicleDetail ? ` (${carDetail ?? vehicleDetail})` : "";
  return `${when}${where}${car}`;
}

/**
 * A standalone gift-voucher purchase (spec §6f follow-up -- previously
 * a voucher only ever existed as a side effect of cancelling a
 * booking) uses redemption_code as its Xendit external_id, the same
 * role booking_code plays for a normal booking. Checked only after the
 * bookings lookup above comes up empty, same "one payment, one record
 * to find" shape either way.
 */
async function handleGiftVoucherWebhook(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  externalId: string,
  status: string
) {
  const { data: voucher } = await supabase
    .from("gift_vouchers")
    .select(
      "id, status, product_id, value_amount_idr, value_amount_usd, purchaser_customer_id, recipient_name, redemption_code, discount_code_id, referred_by_agent_id"
    )
    .eq("redemption_code", externalId)
    .maybeSingle();

  if (!voucher) {
    return NextResponse.json({ ok: true, note: "ignored: no matching booking or gift voucher" });
  }

  // Same "webhooks retry, already-processed is a no-op" reasoning as
  // the booking branch above.
  if (voucher.status !== "pending_payment") {
    return NextResponse.json({ ok: true, note: "already processed" });
  }

  if (PAID_STATUSES.has(status)) {
    // 12 months from *now* (actual payment confirmation), not from
    // whenever the row was first inserted -- the column's own default
    // would otherwise start the clock at checkout-start time, docking
    // whatever time someone spent on Xendit's payment page from every
    // voucher's real validity window.
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    const { error: updateError } = await supabase
      .from("gift_vouchers")
      .update({ status: "issued", expires_at: expiresAt.toISOString() })
      .eq("id", voucher.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (voucher.referred_by_agent_id) {
      // Same tier-resolution logic as the booking branch above -- a
      // gift purchase earns commission at whatever tier the agent has
      // already reached through confirmed *bookings*, but doesn't
      // itself count toward reaching a higher one.
      const [{ count: priorConfirmedCount }, { data: tiers }] = await Promise.all([
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("referred_by_agent_id", voucher.referred_by_agent_id)
          .eq("status", "paid_confirmed"),
        supabase
          .from("commission_tiers")
          .select("id, name, min_referrals, commission_percent, sort_order"),
      ]);

      const tier = resolveCommissionTier(tiers ?? [], priorConfirmedCount ?? 0);
      if (tier) {
        await supabase
          .from("gift_vouchers")
          .update({
            commission_amount_usd: (voucher.value_amount_usd ?? 0) * (tier.commission_percent / 100),
          })
          .eq("id", voucher.id);
      }
    }

    const [{ data: product }, { data: purchaser }, { data: staff }] = await Promise.all([
      supabase.from("products").select("title").eq("id", voucher.product_id).maybeSingle(),
      supabase
        .from("customers")
        .select("name, email")
        .eq("id", voucher.purchaser_customer_id)
        .maybeSingle(),
      supabase.from("admin_users").select("email").eq("status", "active"),
    ]);

    if (product && purchaser) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await sendGiftVoucherPurchaseConfirmedEmail({
        toEmail: purchaser.email,
        purchaserName: purchaser.name,
        productTitle: product.title,
        voucherCode: voucher.redemption_code,
        valueIdr: voucher.value_amount_idr,
        recipientName: voucher.recipient_name,
        expiresAt: expiresAt.toISOString(),
        redeemUrl: `${siteUrl}/redeem?code=${encodeURIComponent(voucher.redemption_code)}`,
      });

      await Promise.all(
        (staff ?? []).map((admin) =>
          sendNewGiftVoucherPurchaseStaffEmail({
            toEmail: admin.email,
            productTitle: product.title,
            valueIdr: voucher.value_amount_idr,
            voucherCode: voucher.redemption_code,
            purchaserName: purchaser.name,
            purchaserEmail: purchaser.email,
            recipientName: voucher.recipient_name,
          })
        )
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (FAILED_STATUSES.has(status)) {
    // No capacity to release -- a gift purchase never reserved any
    // (no date was ever chosen) -- but a discount code use does need
    // giving back, same as a normal booking's failed-payment path.
    await supabase.from("gift_vouchers").update({ status: "expired" }).eq("id", voucher.id);
    if (voucher.discount_code_id) {
      await supabase.rpc("release_discount_code", { p_discount_code_id: voucher.discount_code_id });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, note: `ignored status: ${status}` });
}
