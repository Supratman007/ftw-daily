import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { formatIdr } from "@/lib/currency";
import { customerLogoutAction } from "@/app/actions";

interface VoucherRow {
  id: string;
  redemption_code: string;
  value_amount_idr: number;
  recipient_name: string;
  status: "pending_payment" | "issued" | "redeemed" | "expired";
  expires_at: string;
  product_id: string;
}

/**
 * Where Xendit's success_redirect_url sends the purchaser right after
 * they pay for a gift voucher -- same "webhook can land a few seconds
 * after this redirect, so pending_payment here isn't an error" shape
 * as /confirmation/[bookingId] for a normal booking.
 */
export default async function GiftConfirmationPage({
  params,
}: {
  params: Promise<{ voucherId: string }>;
}) {
  const { voucherId } = await params;
  const customer = await requireCustomer(`/gift/confirmation/${voucherId}`);

  const supabase = await createSupabaseServerClient();
  const { data: voucher } = await supabase
    .from("gift_vouchers")
    .select("id, redemption_code, value_amount_idr, recipient_name, status, expires_at, product_id")
    .eq("id", voucherId)
    .eq("purchaser_customer_id", customer.id)
    .maybeSingle();

  if (!voucher) {
    // Same "wrong account vs. doesn't exist" distinction as the normal
    // booking confirmation page -- see that file for the full reasoning.
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: anyVoucher } = await serviceClient
      .from("gift_vouchers")
      .select("id")
      .eq("id", voucherId)
      .maybeSingle();

    if (anyVoucher) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Wrong account</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">
            This voucher isn&apos;t linked to {customer.email}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            You&apos;re currently signed in as {customer.email}, but this voucher was purchased
            under a different account. Log out and sign back in with the email you used to buy it.
          </p>
          <form action={customerLogoutAction} className="mt-6">
            <button type="submit" className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white">
              Log out
            </button>
          </form>
        </main>
      );
    }

    notFound();
  }
  const v = voucher as VoucherRow;

  const { data: product } = await supabase
    .from("products")
    .select("title, slug")
    .eq("id", v.product_id)
    .maybeSingle();

  if (v.status === "pending_payment") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <meta httpEquiv="refresh" content="4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Gift voucher</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">
          Confirming your payment&hellip;
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          This usually takes just a few seconds. This page will update on its own -- no need to
          refresh.
        </p>
      </main>
    );
  }

  if (v.status === "expired") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="mt-2 font-serif text-2xl font-semibold text-coral-dark">
          Payment didn&apos;t go through
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          This gift voucher wasn&apos;t completed, so nothing was charged. You can try again from
          the trip page.
        </p>
        {product?.slug && (
          <Link
            href={`/p/${product.slug}/gift`}
            className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            Back to trip
          </Link>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-teal">Gift voucher purchased</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ocean">
        {product?.title ?? "Your gift"}
      </h1>

      <div className="mt-6 w-full rounded-2xl border border-sand-deep bg-white p-6 text-left text-sm">
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Voucher code</span>
          <span className="font-mono font-semibold text-ink">{v.redemption_code}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">For</span>
          <span className="text-ink">{v.recipient_name}</span>
        </div>
        <div className="flex justify-between border-b border-sand-deep py-2">
          <span className="text-ink-soft">Expires</span>
          <span className="text-ink">{new Date(v.expires_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-ink-soft">Total paid</span>
          <span className="font-semibold text-ink">{formatIdr(v.value_amount_idr)}</span>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        A receipt with sharing instructions is on its way to your email. Pass the code along to{" "}
        {v.recipient_name} whenever you&apos;re ready.
      </p>

      <Link href="/" className="mt-6 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white">
        Browse more trips
      </Link>
    </main>
  );
}
