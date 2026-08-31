"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createXenditInvoice } from "@/lib/xendit/client";
import { generateVoucherCode } from "@/lib/cancellations/voucherCode";
import { usdToIdr } from "@/lib/currency";
import type { Product } from "@/lib/products/types";

/** Standalone gift-voucher purchase -- no capacity reservation (no
 * date is being claimed yet, only paid for) and no discount/referral
 * handling (spec never asked for either on a gift; keeping this
 * minimal rather than guessing they should apply here too). Otherwise
 * the same "create the row before payment, let the webhook flip it
 * once Xendit confirms" shape as startCheckoutAction. */
export async function startGiftCheckoutAction(productId: string, slug: string, formData: FormData) {
  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const recipientContact = String(formData.get("recipient_email") ?? "").trim();
  const paxRaw = Number(formData.get("pax") ?? "0");
  const pax = Number.isInteger(paxRaw) ? paxRaw : 0;

  const returnTo = `/p/${slug}/gift`;
  const customer = await requireCustomer(returnTo);

  function fail(message: string): never {
    const params = new URLSearchParams({
      pax: String(pax),
      recipient_name: recipientName,
      recipient_email: recipientContact,
      error: message,
    });
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

  const totalUsd = p.adult_price_usd * pax;
  const totalIdr = usdToIdr(totalUsd);
  const voucherCode = generateVoucherCode();
  const voucherId = crypto.randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
    fail(`Couldn't start payment: ${(err as Error).message}`);
  }

  const { error: insertError } = await supabase.from("gift_vouchers").insert({
    id: voucherId,
    purchaser_customer_id: customer.id,
    product_id: p.id,
    value_amount_idr: totalIdr,
    recipient_name: recipientName,
    recipient_contact: recipientContact,
    redemption_code: voucherCode,
    status: "pending_payment",
    xendit_invoice_id: invoice.id,
    xendit_invoice_url: invoice.invoice_url,
  });

  if (insertError) {
    fail(`Couldn't create your gift voucher: ${insertError.message}`);
  }

  redirect(invoice.invoice_url);
}
