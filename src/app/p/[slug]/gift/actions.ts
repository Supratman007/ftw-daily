"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { createXenditInvoice } from "@/lib/xendit/client";
import { generateVoucherCode } from "@/lib/cancellations/voucherCode";
import { usdToIdr } from "@/lib/currency";
import { REFERRAL_COOKIE_NAME } from "@/lib/agents/referralCookie";
import type { Product } from "@/lib/products/types";

/** Standalone gift-voucher purchase -- no capacity reservation (no
 * date is being claimed yet, only paid for), but otherwise the same
 * discount-code and referral handling as startCheckoutAction, so a
 * gift bought with a promo code or through an agent's link isn't
 * silently treated differently from a normal booking. Same "create the
 * row before payment, let the webhook flip it once Xendit confirms"
 * shape too. */
export async function startGiftCheckoutAction(productId: string, slug: string, formData: FormData) {
  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const recipientContact = String(formData.get("recipient_email") ?? "").trim();
  const paxRaw = Number(formData.get("pax") ?? "0");
  const pax = Number.isInteger(paxRaw) ? paxRaw : 0;
  const discountCodeInput = String(formData.get("discount_code") ?? "").trim();

  // Same automatic, nothing-for-the-customer-to-see cookie as normal
  // checkout -- set by proxy.ts from a ?ref=CODE link.
  const cookieStore = await cookies();
  const referralCodeInput = cookieStore.get(REFERRAL_COOKIE_NAME)?.value?.trim() ?? "";

  const returnTo = `/p/${slug}/gift`;
  const customer = await requireCustomer(returnTo);

  function fail(message: string): never {
    const params = new URLSearchParams({
      pax: String(pax),
      recipient_name: recipientName,
      recipient_email: recipientContact,
      error: message,
    });
    if (discountCodeInput) params.set("discount_code", discountCodeInput);
    redirect(`${returnTo}?${params.toString()}`);
  }

  if (!recipientName) fail("Please enter who this gift is for.");
  if (!recipientContact) fail("Please enter how we'd reach the recipient.");
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

  if (!product) fail("This trip is no longer available.");
  const p = product as Product;
  if (!p.is_bookable) fail("This trip can't be gifted online yet -- please contact us.");
  if (p.adult_price_usd == null) fail("This trip doesn't have a price set yet — please contact us.");

  const subtotalUsd = p.adult_price_usd * pax;
  const serviceClient = createSupabaseServiceRoleClient();

  // Same atomic-reservation pattern startCheckoutAction uses, so a
  // limited-use code can't be redeemed twice by two people at once.
  let discountCodeId: string | null = null;
  let discountAmountUsd = 0;
  if (discountCodeInput) {
    const { data: discountRows, error: discountError } = await serviceClient.rpc(
      "reserve_discount_code",
      { p_code: discountCodeInput }
    );

    if (discountError) fail(`Couldn't check that discount code: ${discountError.message}`);

    const discountRow = discountRows?.[0];
    if (!discountRow) fail("That discount code isn't valid, has expired, or has already been fully used.");

    discountCodeId = discountRow.id;
    discountAmountUsd =
      discountRow.discount_type === "percent"
        ? subtotalUsd * (discountRow.discount_value / 100)
        : Math.min(discountRow.discount_value, subtotalUsd);
  }

  // Same "an unrecognized code never blocks checkout, only decides
  // commission" reasoning as startCheckoutAction.
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
  const voucherCode = generateVoucherCode();
  const voucherId = crypto.randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  async function releaseReservations() {
    if (discountCodeId) {
      await serviceClient.rpc("release_discount_code", { p_discount_code_id: discountCodeId });
    }
  }

  let invoice;
  try {
    invoice = await createXenditInvoice({
      externalId: voucherCode,
      amountIdr: totalIdr,
      payerEmail: customer.email,
      description: `Gift voucher: ${p.title}`,
      successRedirectUrl: `${siteUrl}/gift/confirmation/${voucherId}`,
      failureRedirectUrl: `${siteUrl}/p/${slug}/gift`,
    });
  } catch (err) {
    await releaseReservations();
    fail(`Couldn't start payment: ${(err as Error).message}`);
  }

  const { error: insertError } = await supabase.from("gift_vouchers").insert({
    id: voucherId,
    purchaser_customer_id: customer.id,
    product_id: p.id,
    value_amount_idr: totalIdr,
    value_amount_usd: finalSubtotalUsd,
    discount_code_id: discountCodeId,
    discount_code: discountCodeInput || null,
    discount_amount_usd: discountAmountUsd,
    referred_by_agent_id: referredByAgentId,
    recipient_name: recipientName,
    recipient_contact: recipientContact,
    redemption_code: voucherCode,
    status: "pending_payment",
    xendit_invoice_id: invoice.id,
    xendit_invoice_url: invoice.invoice_url,
  });

  if (insertError) {
    await releaseReservations();
    fail(`Couldn't create your gift voucher: ${insertError.message}`);
  }

  redirect(invoice.invoice_url);
}
