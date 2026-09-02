"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { createXenditInvoice } from "@/lib/xendit/client";
import { generateBookingCode } from "@/lib/bookings/booking-code";
import { idrToUsd, usdToIdr } from "@/lib/currency";
import { REFERRAL_COOKIE_NAME } from "@/lib/agents/referralCookie";
import { OTHER_MEETING_POINT_VALUE, type CarPackage, type CarType, type MeetingPoint } from "@/lib/cars/types";
import type { Product } from "@/lib/products/types";

export async function startCheckoutAction(productId: string, slug: string, formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const paxRaw = Number(formData.get("pax") ?? "0");
  const pax = Number.isInteger(paxRaw) ? paxRaw : 0;
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();
  const hotelName = String(formData.get("hotel_name") ?? "").trim();
  const roomNumber = String(formData.get("room_number") ?? "").trim();

  // No visible/editable field for this -- it's entirely automatic, off
  // the 30-day cookie proxy.ts sets from ?ref=CODE, same as any other
  // referral-tracking link. Nothing for the customer to see or clear.
  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const returnTo = `/p/${slug}?date=${encodeURIComponent(date)}&pax=${pax}`;
  const customer = await requireCustomer(returnTo);

  function fail(message: string): never {
    const params = new URLSearchParams({ date, pax: String(pax), error: message });
    if (discountCodeInput) params.set("discount_code", discountCodeInput);
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

/**
 * Car Hire checkout (spec §6a) -- a fundamentally different pricing
 * shape from startCheckoutAction above: the price comes from the
 * price-grid (car package × pickup area) rather than adult_price_usd ×
 * pax, and there's no shared per-date capacity pool to reserve (a car
 * hire booking is one specific car for one customer, not a seat in a
 * group), so reserve_booking_capacity is skipped entirely. Everything
 * else -- discount codes, referral commission, the Xendit hosted
 * checkout, the pending_payment-then-webhook pattern -- is the same.
 */
export async function startCarHireCheckoutAction(productId: string, slug: string, formData: FormData) {
  const carTypeId = String(formData.get("car_type_id") ?? "");
  const carPackageId = String(formData.get("car_package_id") ?? "");
  const meetingPointIdInput = String(formData.get("meeting_point_id") ?? "");
  const meetingPointCustom = String(formData.get("meeting_point_custom") ?? "").trim();
  const pickupWhatsappNumber = String(formData.get("pickup_whatsapp_number") ?? "").trim();
  const pickupDate = String(formData.get("pickup_date") ?? "");
  const pickupTime = String(formData.get("pickup_time") ?? "");
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();

  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const customer = await requireCustomer(`/p/${slug}`);

  function fail(message: string): never {
    redirect(`/p/${slug}?${new URLSearchParams({ error: message }).toString()}`);
  }

  const isOtherMeetingPoint = meetingPointIdInput === OTHER_MEETING_POINT_VALUE;
  if (!isOtherMeetingPoint && !meetingPointIdInput) {
    fail("Please choose a pickup area.");
  }
  if (isOtherMeetingPoint && !meetingPointCustom) {
    fail("Please tell us your pickup location.");
  }
  // At least a few digits -- not a strict phone format check (customers
  // type these every possible way: spaces, dashes, with/without "+"),
  // just enough to catch someone leaving it blank or typing junk. The
  // driver messaging this number on arrival is the whole point of
  // asking for it.
  if (pickupWhatsappNumber.replace(/\D/g, "").length < 8) {
    fail("Please enter a valid WhatsApp number so your driver can reach you.");
  }

  const pickupDatetime = new Date(`${pickupDate}T${pickupTime}:00`);
  if (!pickupDate || !pickupTime || Number.isNaN(pickupDatetime.getTime())) {
    fail("Please choose a valid pickup date and time.");
  }
  if (pickupDatetime.getTime() < Date.now()) {
    fail("Pickup time must be in the future.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();
  if (!product || (product as Product).product_type !== "car_hire" || !(product as Product).is_bookable) {
    fail("This car isn't available to book online right now.");
  }
  const p = product as Product;

  const { data: carType } = await supabase
    .from("car_types")
    .select("*")
    .eq("id", carTypeId)
    .eq("product_id", p.id)
    .maybeSingle();
  if (!carType) {
    fail("Please choose a car.");
  }
  const ct = carType as CarType;

  const { data: carPackage } = await supabase
    .from("car_packages")
    .select("*")
    .eq("id", carPackageId)
    .eq("car_type_id", ct.id)
    .maybeSingle();
  if (!carPackage) {
    fail("Please choose a duration.");
  }
  const pkg = carPackage as CarPackage;

  let meetingPoint: MeetingPoint | null = null;
  if (!isOtherMeetingPoint) {
    const { data: meetingPointData } = await supabase
      .from("meeting_points")
      .select("*")
      .eq("id", meetingPointIdInput)
      .eq("status", "active")
      .maybeSingle();
    if (!meetingPointData) {
      fail("That pickup area isn't available anymore -- please pick another.");
    }
    meetingPoint = meetingPointData as MeetingPoint;
  }

  // Never trust a price the client could have sent -- always re-read
  // it from the grid server-side, keyed by the (package, meeting
  // point) the customer actually chose. "Other" never has a row here
  // by definition (it means "not priced yet, contact us"), so it can
  // never reach checkout even if the disabled submit button were
  // bypassed.
  let priceIdr: number | null = null;
  if (meetingPoint) {
    const { data: priceRow } = await supabase
      .from("car_package_prices")
      .select("price_idr")
      .eq("car_package_id", pkg.id)
      .eq("meeting_point_id", meetingPoint.id)
      .maybeSingle();
    priceIdr = priceRow?.price_idr ?? null;
  }
  if (priceIdr === null) {
    fail("We don't have a set price for that combination yet -- please contact us for a quote.");
  }

  const subtotalUsd = idrToUsd(priceIdr);
  const serviceClient = createSupabaseServiceRoleClient();

  let discountCodeId: string | null = null;
  let discountAmountUsd = 0;
  if (discountCodeInput) {
    const { data: discountRows, error: discountError } = await serviceClient.rpc(
      "reserve_discount_code",
      { p_code: discountCodeInput }
    );
    if (discountError) {
      fail(`Couldn't check that discount code: ${discountError.message}`);
    }
    const discountRow = discountRows?.[0];
    if (!discountRow) {
      fail("That discount code isn't valid, has expired, or has already been fully used.");
    }
    discountCodeId = discountRow.id;
    discountAmountUsd =
      discountRow.discount_type === "percent"
        ? subtotalUsd * (discountRow.discount_value / 100)
        : Math.min(discountRow.discount_value, subtotalUsd);
  }

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
  // Only round-trip through USD (and risk drifting from the admin's
  // exact IDR price) when a discount actually changed the amount --
  // the common no-discount case charges precisely what the price grid
  // says.
  const totalIdr = discountAmountUsd > 0 ? usdToIdr(finalSubtotalUsd) : priceIdr;
  const bookingCode = generateBookingCode();
  const bookingId = crypto.randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  async function releaseDiscount() {
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
      description: `${p.title} — ${ct.name} (${pkg.duration_hours}h)`,
      successRedirectUrl: `${siteUrl}/confirmation/${bookingId}`,
      failureRedirectUrl: `${siteUrl}/p/${slug}`,
    });
  } catch (err) {
    await releaseDiscount();
    fail(`Couldn't start payment: ${(err as Error).message}`);
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    id: bookingId,
    booking_code: bookingCode,
    customer_id: customer.id,
    product_id: p.id,
    slot_date: pickupDate,
    // No separate traveler count for Car Hire (spec §6a) -- the car's
    // own seat capacity is the only headcount that means anything
    // here, stored so it still shows up anywhere pax_count is
    // displayed (e.g. "Travelers: 6").
    pax_count: ct.capacity_tier,
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
    car_type_id: ct.id,
    car_package_id: pkg.id,
    pickup_datetime: pickupDatetime.toISOString(),
    meeting_point_id: meetingPoint?.id ?? null,
    // When a real area was chosen, meetingPointCustom is just the
    // extra "find me here" detail (hotel/room, airport gate) --
    // otherwise it's the pickup location itself, already required
    // above. Either way it's worth keeping, so it's never dropped just
    // because a real meeting point was also selected.
    meeting_point_custom: meetingPointCustom || null,
    pickup_whatsapp_number: pickupWhatsappNumber,
  });

  if (insertError) {
    await releaseDiscount();
    fail(`Couldn't create your booking: ${insertError.message}`);
  }

  redirect(invoice.invoice_url);
}

/**
 * Transport checkout (spec §6e) -- same shape as Car Hire above but
 * simpler: price is keyed by pickup area alone, no car type/duration
 * involved.
 */
export async function startTransportCheckoutAction(productId: string, slug: string, formData: FormData) {
  const meetingPointIdInput = String(formData.get("meeting_point_id") ?? "");
  const meetingPointCustom = String(formData.get("meeting_point_custom") ?? "").trim();
  const pickupWhatsappNumber = String(formData.get("pickup_whatsapp_number") ?? "").trim();
  const pickupDate = String(formData.get("pickup_date") ?? "");
  const pickupTime = String(formData.get("pickup_time") ?? "");
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();

  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const customer = await requireCustomer(`/p/${slug}`);

  function fail(message: string): never {
    redirect(`/p/${slug}?${new URLSearchParams({ error: message }).toString()}`);
  }

  const isOtherMeetingPoint = meetingPointIdInput === OTHER_MEETING_POINT_VALUE;
  if (!isOtherMeetingPoint && !meetingPointIdInput) {
    fail("Please choose a pickup area.");
  }
  if (isOtherMeetingPoint && !meetingPointCustom) {
    fail("Please tell us your pickup location.");
  }
  if (pickupWhatsappNumber.replace(/\D/g, "").length < 8) {
    fail("Please enter a valid WhatsApp number so your driver can reach you.");
  }

  const pickupDatetime = new Date(`${pickupDate}T${pickupTime}:00`);
  if (!pickupDate || !pickupTime || Number.isNaN(pickupDatetime.getTime())) {
    fail("Please choose a valid pickup date and time.");
  }
  if (pickupDatetime.getTime() < Date.now()) {
    fail("Pickup time must be in the future.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();
  if (!product || (product as Product).product_type !== "transport" || !(product as Product).is_bookable) {
    fail("This isn't available to book online right now.");
  }
  const p = product as Product;

  let meetingPoint: MeetingPoint | null = null;
  if (!isOtherMeetingPoint) {
    const { data: meetingPointData } = await supabase
      .from("meeting_points")
      .select("*")
      .eq("id", meetingPointIdInput)
      .eq("status", "active")
      .maybeSingle();
    if (!meetingPointData) {
      fail("That pickup area isn't available anymore -- please pick another.");
    }
    meetingPoint = meetingPointData as MeetingPoint;
  }

  let priceIdr: number | null = null;
  if (meetingPoint) {
    const { data: priceRow } = await supabase
      .from("transport_prices")
      .select("price_idr")
      .eq("product_id", p.id)
      .eq("meeting_point_id", meetingPoint.id)
      .maybeSingle();
    priceIdr = priceRow?.price_idr ?? null;
  }
  if (priceIdr === null) {
    fail("We don't have a set price for that pickup area yet -- please contact us for a quote.");
  }

  const subtotalUsd = idrToUsd(priceIdr);
  const serviceClient = createSupabaseServiceRoleClient();

  let discountCodeId: string | null = null;
  let discountAmountUsd = 0;
  if (discountCodeInput) {
    const { data: discountRows, error: discountError } = await serviceClient.rpc(
      "reserve_discount_code",
      { p_code: discountCodeInput }
    );
    if (discountError) {
      fail(`Couldn't check that discount code: ${discountError.message}`);
    }
    const discountRow = discountRows?.[0];
    if (!discountRow) {
      fail("That discount code isn't valid, has expired, or has already been fully used.");
    }
    discountCodeId = discountRow.id;
    discountAmountUsd =
      discountRow.discount_type === "percent"
        ? subtotalUsd * (discountRow.discount_value / 100)
        : Math.min(discountRow.discount_value, subtotalUsd);
  }

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
  const totalIdr = discountAmountUsd > 0 ? usdToIdr(finalSubtotalUsd) : priceIdr;
  const bookingCode = generateBookingCode();
  const bookingId = crypto.randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  async function releaseDiscount() {
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
    await releaseDiscount();
    fail(`Couldn't start payment: ${(err as Error).message}`);
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    id: bookingId,
    booking_code: bookingCode,
    customer_id: customer.id,
    product_id: p.id,
    slot_date: pickupDate,
    // No per-person pricing for Transport either -- 1 is a sentinel,
    // not a real headcount (see the same note on Car Hire above).
    pax_count: 1,
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
    pickup_datetime: pickupDatetime.toISOString(),
    meeting_point_id: meetingPoint?.id ?? null,
    // Same reasoning as Car Hire above: keep the "find me here" detail
    // regardless of whether a real area was also selected.
    meeting_point_custom: meetingPointCustom || null,
    pickup_whatsapp_number: pickupWhatsappNumber,
  });

  if (insertError) {
    await releaseDiscount();
    fail(`Couldn't create your booking: ${insertError.message}`);
  }

  redirect(invoice.invoice_url);
}
