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
import { hasEnoughLeadTime, pickupDatetimeInBusinessTimezone, tripStartFromDate } from "@/lib/products/leadTime";
import type { Product } from "@/lib/products/types";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { recordReferralAttribution } from "@/lib/agents/referralAttribution";

export async function startCheckoutAction(productId: string, slug: string, formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const paxRaw = Number(formData.get("pax") ?? "0");
  const pax = Number.isInteger(paxRaw) ? paxRaw : 0;
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();
  const hotelName = String(formData.get("hotel_name") ?? "").trim();
  const roomNumber = String(formData.get("room_number") ?? "").trim();
  // A hidden field on the checkout form (see ProductPage.tsx) rather
  // than anything the customer picks here -- just carries forward
  // whichever locale they were already browsing in, so every redirect
  // from this action (back to the trip page on error, to Xendit and
  // then back to the confirmation page) keeps them in that language
  // instead of dropping them back to English mid-checkout.
  const locale = formData.get("locale") === "id" ? "id" : "en";
  const pathPrefix = locale === "id" ? "/id" : "";
  const dict = getDictionary(locale).checkoutErrors;

  // No visible/editable field for this -- it's entirely automatic, off
  // the 30-day cookie proxy.ts sets from ?ref=CODE, same as any other
  // referral-tracking link. Nothing for the customer to see or clear.
  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const returnTo = `${pathPrefix}/p/${slug}?date=${encodeURIComponent(date)}&pax=${pax}`;
  const customer = await requireCustomer(returnTo);

  function fail(message: string): never {
    const params = new URLSearchParams({ date, pax: String(pax), error: message });
    if (discountCodeInput) params.set("discount_code", discountCodeInput);
    if (hotelName) params.set("hotel_name", hotelName);
    if (roomNumber) params.set("room_number", roomNumber);
    redirect(`${pathPrefix}/p/${slug}?${params.toString()}`);
  }

  if (!date || Number.isNaN(Date.parse(date))) {
    fail(dict.invalidDate);
  }
  if (!pax || pax < 1 || pax > 20) {
    fail(dict.travelersRange);
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (!product) {
    fail(dict.tripUnavailable);
  }
  const p = product as Product;
  if (!p.is_bookable) {
    fail(dict.needsManualConfirmation);
  }
  if (p.adult_price_usd == null) {
    fail(dict.noPriceSet);
  }
  if (!hasEnoughLeadTime(tripStartFromDate(date), p.min_lead_hours)) {
    fail(dict.needMoreLeadTimeTrip(p.min_lead_hours));
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
    fail(dict.couldntCheckAvailability(reserveError.message));
  }
  if (!reserved) {
    fail(dict.fullyBooked);
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
      fail(dict.couldntCheckDiscount(discountError.message));
    }

    const discountRow = discountRows?.[0];
    if (!discountRow) {
      await serviceClient.rpc("release_booking_capacity", {
        p_product_id: p.id,
        p_slot_date: date,
        p_pax: pax,
      });
      fail(dict.invalidDiscountCode);
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
      successRedirectUrl: `${siteUrl}${pathPrefix}/confirmation/${bookingId}`,
      failureRedirectUrl: `${siteUrl}${pathPrefix}/p/${slug}`,
    });
  } catch (err) {
    await releaseReservations();
    fail(dict.couldntStartPayment((err as Error).message));
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
    fail(dict.couldntCreateBooking(insertError.message));
  }

  await recordReferralAttribution(serviceClient, {
    agentId: referredByAgentId,
    referralCode: referralCodeInput,
    bookingId,
  });

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
  const passengerName = String(formData.get("passenger_name") ?? "").trim();
  const paxCountRaw = Number(formData.get("pax_count") ?? "0");
  const paxCount = Number.isInteger(paxCountRaw) ? paxCountRaw : 0;
  const pickupWhatsappNumber = String(formData.get("pickup_whatsapp_number") ?? "").trim();
  const flightDetails = String(formData.get("flight_details") ?? "").trim();
  const pickupDate = String(formData.get("pickup_date") ?? "");
  const pickupTime = String(formData.get("pickup_time") ?? "");
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();

  // Hidden field on the form (see CarHireBookingForm) -- same
  // "carries whichever locale the customer was already browsing in"
  // reasoning as startCheckoutAction above, previously missing here
  // entirely, which meant an Indonesian visitor filling out this form
  // got bounced to the English login page and English error redirects.
  const locale = formData.get("locale") === "id" ? "id" : "en";
  const pathPrefix = locale === "id" ? "/id" : "";
  const dict = getDictionary(locale).checkoutErrors;

  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const customer = await requireCustomer(`${pathPrefix}/p/${slug}`);

  function fail(message: string): never {
    redirect(`${pathPrefix}/p/${slug}?${new URLSearchParams({ error: message }).toString()}`);
  }

  const isOtherMeetingPoint = meetingPointIdInput === OTHER_MEETING_POINT_VALUE;
  if (!isOtherMeetingPoint && !meetingPointIdInput) {
    fail(dict.choosePickupArea);
  }
  if (isOtherMeetingPoint && !meetingPointCustom) {
    fail(dict.tellUsPickupLocation);
  }
  if (!passengerName) {
    fail(dict.tellUsWhosTraveling);
  }
  if (paxCount < 1) {
    fail(dict.choosePassengerCount);
  }
  // At least a few digits -- not a strict phone format check (customers
  // type these every possible way: spaces, dashes, with/without "+"),
  // just enough to catch someone leaving it blank or typing junk. The
  // driver messaging this number on arrival is the whole point of
  // asking for it.
  if (pickupWhatsappNumber.replace(/\D/g, "").length < 8) {
    fail(dict.validWhatsapp);
  }

  if (!pickupDate || !pickupTime) {
    fail(dict.validPickupDateTime);
  }
  const pickupDatetime = pickupDatetimeInBusinessTimezone(pickupDate, pickupTime);
  if (Number.isNaN(pickupDatetime.getTime())) {
    fail(dict.validPickupDateTime);
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();
  if (!product || (product as Product).product_type !== "car_hire" || !(product as Product).is_bookable) {
    fail(dict.carUnavailable);
  }
  const p = product as Product;
  if (!hasEnoughLeadTime(pickupDatetime, p.min_lead_hours)) {
    fail(dict.needMoreLeadTimePickup(p.min_lead_hours));
  }

  const { data: carType } = await supabase
    .from("car_types")
    .select("*")
    .eq("id", carTypeId)
    .eq("product_id", p.id)
    .maybeSingle();
  if (!carType) {
    fail(dict.chooseCar);
  }
  const ct = carType as CarType;
  if (paxCount > ct.capacity_tier) {
    fail(dict.capacityExceeded(ct.name, ct.capacity_tier));
  }

  const { data: carPackage } = await supabase
    .from("car_packages")
    .select("*")
    .eq("id", carPackageId)
    .eq("car_type_id", ct.id)
    .maybeSingle();
  if (!carPackage) {
    fail(dict.chooseDuration);
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
      fail(dict.pickupAreaUnavailable);
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
    fail(dict.noPriceForCombination);
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
      fail(dict.couldntCheckDiscount(discountError.message));
    }
    const discountRow = discountRows?.[0];
    if (!discountRow) {
      fail(dict.invalidDiscountCode);
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
      successRedirectUrl: `${siteUrl}${pathPrefix}/confirmation/${bookingId}`,
      failureRedirectUrl: `${siteUrl}${pathPrefix}/p/${slug}`,
    });
  } catch (err) {
    await releaseDiscount();
    fail(dict.couldntStartPayment((err as Error).message));
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    id: bookingId,
    booking_code: bookingCode,
    customer_id: customer.id,
    product_id: p.id,
    slot_date: pickupDate,
    pax_count: paxCount,
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
    passenger_name: passengerName,
    flight_details: flightDetails || null,
  });

  if (insertError) {
    await releaseDiscount();
    fail(dict.couldntCreateBooking(insertError.message));
  }

  await recordReferralAttribution(serviceClient, {
    agentId: referredByAgentId,
    referralCode: referralCodeInput,
    bookingId,
  });

  redirect(invoice.invoice_url);
}

/**
 * Transport checkout (spec §6e) -- same shape as Car Hire above but
 * simpler: price is keyed by pickup area alone, no car type/duration
 * involved.
 */
export async function startTransportCheckoutAction(productId: string, slug: string, formData: FormData) {
  const vehicleTypeId = String(formData.get("vehicle_type_id") ?? "");
  const meetingPointIdInput = String(formData.get("meeting_point_id") ?? "");
  const meetingPointCustom = String(formData.get("meeting_point_custom") ?? "").trim();
  const dropoffIdInput = String(formData.get("dropoff_meeting_point_id") ?? "");
  const dropoffCustom = String(formData.get("dropoff_location_custom") ?? "").trim();
  const passengerName = String(formData.get("passenger_name") ?? "").trim();
  const paxCountRaw = Number(formData.get("pax_count") ?? "0");
  const paxCount = Number.isInteger(paxCountRaw) ? paxCountRaw : 0;
  const pickupWhatsappNumber = String(formData.get("pickup_whatsapp_number") ?? "").trim();
  const flightDetails = String(formData.get("flight_details") ?? "").trim();
  const pickupDate = String(formData.get("pickup_date") ?? "");
  const pickupTime = String(formData.get("pickup_time") ?? "");
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();

  // Same previously-missing hidden-field fix as startCarHireCheckoutAction
  // above.
  const locale = formData.get("locale") === "id" ? "id" : "en";
  const pathPrefix = locale === "id" ? "/id" : "";
  const dict = getDictionary(locale).checkoutErrors;

  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const customer = await requireCustomer(`${pathPrefix}/p/${slug}`);

  function fail(message: string): never {
    redirect(`${pathPrefix}/p/${slug}?${new URLSearchParams({ error: message }).toString()}`);
  }

  const isOtherMeetingPoint = meetingPointIdInput === OTHER_MEETING_POINT_VALUE;
  if (!isOtherMeetingPoint && !meetingPointIdInput) {
    fail(dict.choosePickupArea);
  }
  if (isOtherMeetingPoint && !meetingPointCustom) {
    fail(dict.tellUsPickupLocation);
  }
  const isOtherDropoff = dropoffIdInput === OTHER_MEETING_POINT_VALUE;
  if (!isOtherDropoff && !dropoffIdInput) {
    fail(dict.chooseDropoffArea);
  }
  if (isOtherDropoff && !dropoffCustom) {
    fail(dict.tellUsDropoffLocation);
  }
  if (!isOtherMeetingPoint && !isOtherDropoff && meetingPointIdInput === dropoffIdInput) {
    fail(dict.samePickupDropoff);
  }
  if (!passengerName) {
    fail(dict.tellUsWhosTraveling);
  }
  if (paxCount < 1 || paxCount > 20) {
    fail(dict.passengersRange);
  }
  if (pickupWhatsappNumber.replace(/\D/g, "").length < 8) {
    fail(dict.validWhatsapp);
  }

  if (!pickupDate || !pickupTime) {
    fail(dict.validPickupDateTime);
  }
  const pickupDatetime = pickupDatetimeInBusinessTimezone(pickupDate, pickupTime);
  if (Number.isNaN(pickupDatetime.getTime())) {
    fail(dict.validPickupDateTime);
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();
  if (!product || (product as Product).product_type !== "transport" || !(product as Product).is_bookable) {
    fail(dict.transportUnavailable);
  }
  const p = product as Product;
  if (!hasEnoughLeadTime(pickupDatetime, p.min_lead_hours)) {
    fail(dict.needMoreLeadTimePickup(p.min_lead_hours));
  }

  const { data: vehicleType } = await supabase
    .from("transport_vehicle_types")
    .select("*")
    .eq("id", vehicleTypeId)
    .eq("product_id", p.id)
    .maybeSingle();
  if (!vehicleType) {
    fail(dict.chooseVehicle);
  }

  let meetingPoint: MeetingPoint | null = null;
  if (!isOtherMeetingPoint) {
    const { data: meetingPointData } = await supabase
      .from("meeting_points")
      .select("*")
      .eq("id", meetingPointIdInput)
      .eq("status", "active")
      .maybeSingle();
    if (!meetingPointData) {
      fail(dict.pickupAreaUnavailable);
    }
    meetingPoint = meetingPointData as MeetingPoint;
  }

  let dropoffPoint: MeetingPoint | null = null;
  if (!isOtherDropoff) {
    const { data: dropoffData } = await supabase
      .from("meeting_points")
      .select("*")
      .eq("id", dropoffIdInput)
      .eq("status", "active")
      .maybeSingle();
    if (!dropoffData) {
      fail(dict.dropoffAreaUnavailable);
    }
    dropoffPoint = dropoffData as MeetingPoint;
  }

  // A route priced only in one direction still quotes for the reverse
  // trip -- most operators charge the same either way -- but an
  // explicit row for the exact direction the customer picked always
  // wins over the reverse fallback.
  let priceIdr: number | null = null;
  if (meetingPoint && dropoffPoint) {
    const { data: priceRows } = await supabase
      .from("transport_prices")
      .select("price_idr, from_meeting_point_id, to_meeting_point_id")
      .eq("vehicle_type_id", vehicleType.id)
      .in("from_meeting_point_id", [meetingPoint.id, dropoffPoint.id])
      .in("to_meeting_point_id", [meetingPoint.id, dropoffPoint.id]);
    const exact = priceRows?.find(
      (r) => r.from_meeting_point_id === meetingPoint.id && r.to_meeting_point_id === dropoffPoint.id
    );
    const reverse = priceRows?.find(
      (r) => r.from_meeting_point_id === dropoffPoint.id && r.to_meeting_point_id === meetingPoint.id
    );
    priceIdr = exact?.price_idr ?? reverse?.price_idr ?? null;
  }
  if (priceIdr === null) {
    fail(dict.noPriceForRoute);
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
      fail(dict.couldntCheckDiscount(discountError.message));
    }
    const discountRow = discountRows?.[0];
    if (!discountRow) {
      fail(dict.invalidDiscountCode);
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
      description: `${p.title} — ${vehicleType.name} (${meetingPoint?.name ?? meetingPointCustom} → ${dropoffPoint?.name ?? dropoffCustom})`,
      successRedirectUrl: `${siteUrl}${pathPrefix}/confirmation/${bookingId}`,
      failureRedirectUrl: `${siteUrl}${pathPrefix}/p/${slug}`,
    });
  } catch (err) {
    await releaseDiscount();
    fail(dict.couldntStartPayment((err as Error).message));
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    id: bookingId,
    booking_code: bookingCode,
    customer_id: customer.id,
    product_id: p.id,
    slot_date: pickupDate,
    transport_vehicle_type_id: vehicleType.id,
    pax_count: paxCount,
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
    dropoff_meeting_point_id: dropoffPoint?.id ?? null,
    dropoff_location_custom: dropoffCustom || null,
    pickup_whatsapp_number: pickupWhatsappNumber,
    passenger_name: passengerName,
    flight_details: flightDetails || null,
  });

  if (insertError) {
    await releaseDiscount();
    fail(dict.couldntCreateBooking(insertError.message));
  }

  await recordReferralAttribution(serviceClient, {
    agentId: referredByAgentId,
    referralCode: referralCodeInput,
    bookingId,
  });

  redirect(invoice.invoice_url);
}
