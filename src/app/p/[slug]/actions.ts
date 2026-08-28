"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { createXenditInvoice } from "@/lib/xendit/client";
import { generateBookingCode } from "@/lib/bookings/booking-code";
import { usdToIdr } from "@/lib/currency";
import type { Product } from "@/lib/products/types";

export async function startCheckoutAction(productId: string, slug: string, formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const paxRaw = Number(formData.get("pax") ?? "0");
  const pax = Number.isInteger(paxRaw) ? paxRaw : 0;
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();
  const referralCodeInput = String(formData.get("referral_code") ?? "").trim();
  const hotelName = String(formData.get("hotel_name") ?? "").trim();
  const roomNumber = String(formData.get("room_number") ?? "").trim();

  const returnTo = `/p/${slug}?date=${encodeURIComponent(date)}&pax=${pax}`;
  const customer = await requireCustomer(returnTo);

  function fail(message: string): never {
    const params = new URLSearchParams({ date, pax: String(pax), error: message });
    if (discountCodeInput) params.set("discount_code", discountCodeInput);
    if (referralCodeInput) params.set("referral_code", referralCodeInput);
    if (hotelName) params.set("hotel_name", hotelName);
    if (roomNumber) params.set("room_number", roomNumber);
    redirect(`/p/${slug}?${params.toString()}`);
  }

  if (!date || Number.isNaN(Date.parse(date))) {
    fail("Please choose a valid date.");
  }
  if (!pax || pax < 1 || pax > 20) {
    fail("Please choose between 1 and 20 travelers.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (!product) {
    fail("This trip is no longer available.");
  }
  const p = product as Product;
  if (!p.is_bookable) {
    fail("This trip needs manual confirmation and can't be booked online yet.");
  }
  if (p.adult_price_usd == null) {
    fail("This trip doesn't have a price set yet — please contact us.");
  }

  // The atomic, race-safe capacity check (spec §13) -- must run before
  // we create anything else, using the service-role client since this
  // function is restricted to service_role in the database.
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: reserved, error: reserveError } = await serviceClient.rpc(
    "reserve_booking_capacity",
    {
      p_product_id: p.id,
      p_slot_date: date,
      p_pax: pax,
      p_default_capacity: p.capacity_per_date,
    }
  );

  if (reserveError) {
    fail(`Couldn't check availability: ${reserveError.message}`);
  }
  if (!reserved) {
    fail("Sorry, that date is fully booked. Please try a different date.");
  }

  const subtotalUsd = p.adult_price_usd * pax;

  // Same atomic-reservation pattern as capacity above, so a
  // limited-use code can't be redeemed twice by two people at once.
  let discountCodeId: string | null = null;
  let discountAmountUsd = 0;
  if (discountCodeInput) {
    const { data: discountRows, error: discountError } = await serviceClient.rpc(
      "reserve_discount_code",
      { p_code: discountCodeInput }
    );

    if (discountError) {
      await serviceClient.rpc("release_booking_capacity", {
        p_product_id: p.id,
        p_slot_date: date,
        p_pax: pax,
      });
      fail(`Couldn't check that discount code: ${discountError.message}`);
    }

    const discountRow = discountRows?.[0];
    if (!discountRow) {
      await serviceClient.rpc("release_booking_capacity", {
        p_product_id: p.id,
        p_slot_date: date,
        p_pax: pax,
      });
      fail("That discount code isn't valid, has expired, or has already been fully used.");
    }

    discountCodeId = discountRow.id;
    discountAmountUsd =
      discountRow.discount_type === "percent"
        ? subtotalUsd * (discountRow.discount_value / 100)
        : Math.min(discountRow.discount_value, subtotalUsd);
  }

  // Unlike the discount code above, an unrecognized/typo'd referral
  // code never blocks checkout or changes the price -- it only decides
  // who (if anyone) earns commission, so it fails silently rather than
  // through fail(). Only an active agent's code counts; a pending or
  // suspended agent's link shouldn't earn them credit.
  let referredByAgentId: string | null = null;
  if (referralCodeInput) {
    const { data: agentRow } = await serviceClient
      .from("sales_agents")
      .select("id")
      .eq("referral_code", referralCodeInput.toUpperCase())
      .eq("status", "active")
      .maybeSingle();
    referredByAgentId = agentRow?.id ?? null;
  }

  const finalSubtotalUsd = Math.max(0, subtotalUsd - discountAmountUsd);
  const totalIdr = usdToIdr(finalSubtotalUsd);
  const bookingCode = generateBookingCode();
  const bookingId = crypto.randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Undoes everything reserved so far (capacity, and the discount code
  // use if one was applied) -- called from every failure path below the
  // point of reservation, so nothing leaks as "used" with no booking
  // behind it.
  async function releaseReservations() {
    await serviceClient.rpc("release_booking_capacity", {
      p_product_id: p.id,
      p_slot_date: date,
      p_pax: pax,
    });
    if (discountCodeId) {
      await serviceClient.rpc("release_discount_code", { p_discount_code_id: discountCodeId });
    }
  }

  let invoice;
  try {
    invoice = await createXenditInvoice({
      externalId: bookingCode,
      amountIdr: totalIdr,
      payerEmail: customer.email,
      description: p.title,
      successRedirectUrl: `${siteUrl}/confirmation/${bookingId}`,
      failureRedirectUrl: `${siteUrl}/p/${slug}`,
    });
  } catch (err) {
    await releaseReservations();
    fail(`Couldn't start payment: ${(err as Error).message}`);
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    id: bookingId,
    booking_code: bookingCode,
    customer_id: customer.id,
    product_id: p.id,
    slot_date: date,
    pax_count: pax,
    subtotal_usd: subtotalUsd,
    total_usd: finalSubtotalUsd,
    total_idr: totalIdr,
    status: "pending_payment",
    xendit_invoice_id: invoice.id,
    xendit_invoice_url: invoice.invoice_url,
    discount_code_id: discountCodeId,
    discount_code: discountCodeInput || null,
    discount_amount_usd: discountAmountUsd,
    referred_by_agent_id: referredByAgentId,
    hotel_name: hotelName || null,
    room_number: roomNumber || null,
  });

  if (insertError) {
    await releaseReservations();
    fail(`Couldn't create your booking: ${insertError.message}`);
  }

  redirect(invoice.invoice_url);
}
