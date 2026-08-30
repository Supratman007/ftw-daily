import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerLogoutAction } from "@/app/actions";

/**
 * Compact top bar shared across every customer-facing page (homepage,
 * product pages, ...) -- without this, a page other than the homepage
 * had no login/account link at all, so a customer redirected back here
 * mid-checkout had no way to reach /account.
 */
export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Staff and Sales Agent accounts are Supabase Auth users too, so a
  // plain "is anyone logged in" check would send them into the
  // customer /account area (requireCustomer() would even silently
  // create a customers row for them). Route each to their own
  // dashboard instead.
  let dashboardHref = "/account";
  let dashboardLabel = "My account";
  if (user) {
    const [{ data: admin }, { data: agent }] = await Promise.all([
      supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle(),
      supabase.from("sales_agents").select("id").eq("id", user.id).maybeSingle(),
    ]);
    if (admin) {
      dashboardHref = "/admin";
      dashboardLabel = "Staff dashboard";
    } else if (agent) {
      dashboardHref = "/agent";
      dashboardLabel = "Agent dashboard";
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-sand-deep bg-white px-6 py-4">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-ink-soft hover:text-ink"
      >
        Adventure Lombok Booking
      </Link>
      <div className="text-sm">
        {user ? (
          <div className="flex items-center gap-3 text-ink-soft">
            <Link href="/redeem" className="font-semibold text-teal hover:underline">
              Redeem a gift voucher
            </Link>
            <Link href={dashboardHref} className="font-semibold text-teal hover:underline">
              {dashboardLabel}
            </Link>
            <form action={customerLogoutAction}>
              <button type="submit" className="font-semibold text-coral-dark hover:underline">
                Log out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-ink-soft">
            <Link href="/redeem" className="font-semibold text-teal hover:underline">
              Redeem a gift voucher
            </Link>
            <Link href="/login" className="font-semibold text-teal hover:underline">
              Log in
            </Link>
            <Link href="/agent/register" className="font-semibold text-coral-dark hover:underline">
              Become a Sales Agent
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
