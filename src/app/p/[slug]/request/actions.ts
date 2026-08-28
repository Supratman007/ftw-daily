"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { generateBookingCode } from "@/lib/bookings/booking-code";
import { usdToIdr, USD_TO_IDR_RATE } from "@/lib/currency";
import { PARK_INSURANCE_FEE_IDR } from "@/lib/bookings/types";
import { REFERRAL_COOKIE_NAME } from "@/lib/agents/referralCookie";
import { sendBookingRequestReceivedEmail, sendNewBookingRequestStaffEmail } from "@/lib/email/resend";
import type { Product } from "@/lib/products/types";
import type { InsuranceType } from "@/lib/bookings/types";

const MAX_PASSPORT_BYTES = 5 * 1024 * 1024; // 5MB
const PASSPORT_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

interface ParsedTraveler {
  fullName: string;
  passportFile: File;
  insuranceType: InsuranceType;
  insuranceNumber: string | null;
  insuranceCompany: string | null;
}

/**
 * Spec §6b's request step: no payment, no Xendit invoice -- just a
 * booking row (status='under_review') and one traveler row per pax
 * with a passport scan, landing in /admin/requests for someone to
 * manually check TNGR park quota against. Mirrors startCheckoutAction
 * in the sibling instant-book action (capacity reservation, referral
 * cookie, booking code) wherever the two flows genuinely overlap.
 */
export async function submitBookingRequestAction(
  productId: string,
  slug: string,
  date: string,
  pax: number,
  formData: FormData
) {
  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const returnTo = `/p/${slug}/request?date=${encodeURIComponent(date)}&pax=${pax}`;
  const customer = await requireCustomer(returnTo);

  const hotelName = String(formData.get("hotel_name") ?? "").trim();
  const roomNumber = String(formData.get("room_number") ?? "").trim();

  function fail(message: string): never {
    redirect(
      `/p/${slug}/request?date=${encodeURIComponent(date)}&pax=${pax}&error=${encodeURIComponent(message)}`
    );
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
  if (p.is_bookable) {
    fail("This trip is instantly bookable -- please use the regular booking form.");
  }
  if (p.adult_price_usd == null) {
    fail("This trip doesn't have a price set yet — please contact us.");
  }

  // Parse and validate every traveler before touching the database --
  // one bad passport upload shouldn't leave a half-reserved booking
  // behind.
  const travelers: ParsedTraveler[] = [];
  for (let i = 0; i < pax; i++) {
    const fullName = String(formData.get(`traveler_name_${i}`) ?? "").trim();
    if (!fullName) {
      fail(`Please enter traveler ${i + 1}'s full name.`);
    }

    const passportFile = formData.get(`passport_${i}`);
    if (!(passportFile instanceof File) || passportFile.size === 0) {
      fail(`Please upload traveler ${i + 1}'s passport.`);
    }
    if (!(passportFile.type in PASSPORT_EXT_BY_MIME)) {
      fail(`Traveler ${i + 1}'s passport must be a JPG, PNG, or PDF.`);
    }
    if (passportFile.size > MAX_PASSPORT_BYTES) {
      fail(`Traveler ${i + 1}'s passport must be smaller than 5MB.`);
    }

    const insuranceTypeRaw = String(formData.get(`insurance_type_${i}`) ?? "");
    if (insuranceTypeRaw !== "self_provided" && insuranceTypeRaw !== "park_provided") {
      fail(`Please choose insurance for traveler ${i + 1}.`);
    }
    const insuranceType = insuranceTypeRaw as InsuranceType;
    const insuranceNumber = String(formData.get(`insurance_number_${i}`) ?? "").trim();
    const insuranceCompany = String(formData.get(`insurance_company_${i}`) ?? "").trim();
    if (insuranceType === "self_provided" && (!insuranceNumber || !insuranceCompany)) {
      fail(
        `Please enter traveler ${i + 1}'s insurance policy number and company, or choose park insurance instead.`
      );
    }

    travelers.push({
      fullName,
      passportFile,
      insuranceType,
      insuranceNumber: insuranceType === "self_provided" ? insuranceNumber : null,
      insuranceCompany: insuranceType === "self_provided" ? insuranceCompany : null,
    });
  }

  // Same atomic, race-safe capacity check as instant checkout -- park
  // quota itself is checked by hand later, but nothing stops two
  // requests from racing for the same in-app capacity limit in the
  // meantime.
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

  async function releaseCapacity() {
    await serviceClient.rpc("release_booking_capacity", {
      p_product_id: p.id,
      p_slot_date: date,
      p_pax: pax,
    });
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

  const subtotalUsd = p.adult_price_usd * pax;
  const parkInsuranceCount = travelers.filter((t) => t.insuranceType === "park_provided").length;
  const insuranceTotalIdr = PARK_INSURANCE_FEE_IDR * parkInsuranceCount;
  const totalIdr = usdToIdr(subtotalUsd) + insuranceTotalIdr;
  // Reference figure only (spec §9: USD is "estimated," IDR is what's
  // actually charged) -- folds the flat IDR insurance fee back into an
  // approximate USD equivalent so the two totals stay consistent.
  const totalUsd = subtotalUsd + insuranceTotalIdr / USD_TO_IDR_RATE;

  const bookingCode = generateBookingCode();
  const bookingId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("bookings").insert({
    id: bookingId,
    booking_code: bookingCode,
    customer_id: customer.id,
    product_id: p.id,
    slot_date: date,
    pax_count: pax,
    subtotal_usd: subtotalUsd,
    total_usd: totalUsd,
    total_idr: totalIdr,
    insurance_total_idr: insuranceTotalIdr,
    status: "under_review",
    referred_by_agent_id: referredByAgentId,
    hotel_name: hotelName || null,
    room_number: roomNumber || null,
  });

  if (insertError) {
    await releaseCapacity();
    fail(`Couldn't submit your request: ${insertError.message}`);
  }

  // Insert traveler rows first (so each gets an id to key its storage
  // path on), then upload passport files via the service-role client
  // -- booking-documents has zero RLS policies, same as agent-documents.
  const { data: insertedTravelers, error: travelersError } = await supabase
    .from("travelers")
    .insert(
      travelers.map((t) => ({
        booking_id: bookingId,
        full_name: t.fullName,
        insurance_type: t.insuranceType,
        insurance_number: t.insuranceNumber,
        insurance_company: t.insuranceCompany,
        insurance_fee_idr: t.insuranceType === "park_provided" ? PARK_INSURANCE_FEE_IDR : 0,
      }))
    )
    .select("id")
    .order("created_at", { ascending: true });

  if (travelersError || !insertedTravelers || insertedTravelers.length !== travelers.length) {
    // The booking row itself is already saved -- don't undo it (the
    // customer would lose their place in the queue over a save error);
    // let them know we need a hand instead, same as the agent
    // registration document-upload failure path.
    redirect(
      `/account/booking/${bookingId}?notice=${encodeURIComponent(
        "Request received, but we couldn't save your traveler details. Please contact us and we'll help you finish."
      )}`
    );
  }

  const uploadResults = await Promise.all(
    insertedTravelers.map((row, i) => {
      const t = travelers[i];
      const path = `${bookingId}/${row.id}.${PASSPORT_EXT_BY_MIME[t.passportFile.type]}`;
      return serviceClient.storage
        .from("booking-documents")
        .upload(path, t.passportFile, { contentType: t.passportFile.type })
        .then(({ error }) => ({ error, path, travelerId: row.id }));
    })
  );

  const failedUpload = uploadResults.find((r) => r.error);
  if (!failedUpload) {
    await Promise.all(
      uploadResults.map((r) =>
        supabase.from("travelers").update({ passport_scan_path: r.path }).eq("id", r.travelerId)
      )
    );
  }

  const [{ data: staff }] = await Promise.all([
    serviceClient.from("admin_users").select("email").eq("status", "active"),
    sendBookingRequestReceivedEmail({
      toEmail: customer.email,
      customerName: customer.name,
      productTitle: p.title,
      slotDate: date,
      bookingCode,
    }),
  ]);

  await Promise.all(
    (staff ?? []).map((admin) =>
      sendNewBookingRequestStaffEmail({
        toEmail: admin.email,
        productTitle: p.title,
        slotDate: date,
        paxCount: pax,
        bookingCode,
        customerName: customer.name,
      })
    )
  );

  redirect(
    failedUpload
      ? `/account/booking/${bookingId}?notice=${encodeURIComponent(
          "Request received, but one of your passport uploads failed. Please contact us and we'll help you finish."
        )}`
      : `/account/booking/${bookingId}`
  );
}
