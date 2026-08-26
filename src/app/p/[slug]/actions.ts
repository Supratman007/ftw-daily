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

  const returnTo = `/p/${slug}?date=${encodeURIComponent(date)}&pax=${pax}`;
  const customer = await requireCustomer(returnTo);

  function fail(message: string): never {
    redirect(`/p/${slug}?date=${encodeURIComponent(date)}&pax=${pax}&error=${encodeURIComponent(message)}`);
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
  const totalIdr = usdToIdr(subtotalUsd);
  const bookingCode = generateBookingCode();
  const bookingId = crypto.randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
    // The reservation from above would otherwise leak (counted as
    // booked with no booking behind it) if we stopped here.
    await serviceClient.rpc("release_booking_capacity", {
      p_product_id: p.id,
      p_slot_date: date,
      p_pax: pax,
    });
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
    total_usd: subtotalUsd,
    total_idr: totalIdr,
    status: "pending_payment",
    xendit_invoice_id: invoice.id,
    xendit_invoice_url: invoice.invoice_url,
  });

  if (insertError) {
    await serviceClient.rpc("release_booking_capacity", {
      p_product_id: p.id,
      p_slot_date: date,
      p_pax: pax,
    });
    fail(`Couldn't create your booking: ${insertError.message}`);
  }

  redirect(invoice.invoice_url);
}
