"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import {
  sendGiftVoucherRefundRequestedEmail,
  sendGiftVoucherRefundRequestStaffEmail,
} from "@/lib/email/resend";

/** The "I want a refund on the gift I bought" path -- covers a
 * not-yet-redeemed voucher regardless of where it came from: bought
 * directly at /p/[slug]/gift (shown on My Bookings), or issued by
 * approving a cancellation as a gift voucher (shown on that booking's
 * own page) -- both were previously impossible to undo at all. No
 * ownership filter needed in the query itself: gift_vouchers' own RLS
 * SELECT policies already cover exactly these two paths (purchased-by
 * or original-booking's-customer-is), so a voucher belonging to
 * someone else just comes back null here, same as "not found." Called
 * from two different pages, so where to redirect back to travels with
 * the form itself rather than being hardcoded. */
export async function requestGiftVoucherRefundAction(voucherId: string, formData: FormData) {
  const customer = await requireCustomer("/account/bookings");
  const reason = String(formData.get("reason") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/account/bookings");

  function fail(message: string): never {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
  }

  if (!reason) fail("Please tell us why, so we can process this quickly.");

  const supabase = await createSupabaseServerClient();
  const { data: voucher } = await supabase
    .from("gift_vouchers")
    .select("id, status, cancellation_requested_at, product_id, redemption_code, recipient_name")
    .eq("id", voucherId)
    .maybeSingle();

  if (!voucher) fail("Voucher not found.");
  if (voucher.status !== "issued") fail("Only an unused voucher can be refunded.");
  if (voucher.cancellation_requested_at) fail("You already have a refund request pending on this voucher.");

  const serviceClient = createSupabaseServiceRoleClient();
  // Service-role, not the customer's session client -- there's no
  // customer UPDATE policy on gift_vouchers, deliberately: a broad one
  // would let a customer's own session write to *any* column on their
  // voucher (status, value_amount_idr, ...), not just these two. Same
  // reasoning, and the same fix, as the Rinjani passport-linking and
  // cancellation-evidence bugs earlier in this app's history.
  const { error: updateError } = await serviceClient
    .from("gift_vouchers")
    .update({ cancellation_requested_at: new Date().toISOString(), cancellation_reason: reason })
    .eq("id", voucherId);

  if (updateError) fail(`Couldn't submit your request: ${updateError.message}`);

  const [{ data: product }, { data: staff }] = await Promise.all([
    serviceClient.from("products").select("title").eq("id", voucher.product_id).maybeSingle(),
    serviceClient.from("admin_users").select("email").eq("status", "active"),
  ]);
  const productTitle = product?.title ?? "your gift voucher";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  await Promise.all([
    sendGiftVoucherRefundRequestedEmail({
      toEmail: customer.email,
      purchaserName: customer.name,
      productTitle,
      voucherCode: voucher.redemption_code,
    }),
    ...(staff ?? []).map((admin) =>
      sendGiftVoucherRefundRequestStaffEmail({
        toEmail: admin.email,
        purchaserName: customer.name,
        purchaserEmail: customer.email,
        productTitle,
        voucherCode: voucher.redemption_code,
        recipientName: voucher.recipient_name,
        reason,
        reviewUrl: `${siteUrl}/admin/vouchers`,
      })
    ),
  ]);

  redirect(
    `${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=${encodeURIComponent(
      "Refund request submitted -- we'll be in touch."
    )}`
  );
}
