import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerLogoutAction } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * Compact top bar shared across every customer-facing page (homepage,
 * product pages, ...) -- without this, a page other than the homepage
 * had no login/account link at all, so a customer redirected back here
 * mid-checkout had no way to reach /account.
 *
 * `locale` defaults to English -- only pages with an actual Indonesian
 * version pass "id" explicitly. The links below (redeem, login,
 * account, agent) still point at their English addresses regardless of
 * locale, since those pages don't have /id versions yet; only the
 * *labels* are translated so far.
 */
export async function SiteHeader({ locale = DEFAULT_LOCALE }: { locale?: Locale } = {}) {
  const dict = getDictionary(locale).common;
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
  let dashboardLabel = dict.myAccount;
  if (user) {
    const [{ data: admin }, { data: agent }] = await Promise.all([
      supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle(),
      supabase.from("sales_agents").select("id").eq("id", user.id).maybeSingle(),
    ]);
    if (admin) {
      dashboardHref = "/admin";
      dashboardLabel = dict.staffDashboard;
    } else if (agent) {
      dashboardHref = "/agent";
      dashboardLabel = dict.agentDashboard;
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-sand-deep bg-white px-6 py-4">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-ink-soft hover:text-ink"
      >
        {dict.siteName}
      </Link>
      <div className="text-sm">
        {user ? (
          <div className="flex items-center gap-3 text-ink-soft">
            <Link href="/redeem" className="font-semibold text-teal hover:underline">
              {dict.redeemVoucher}
            </Link>
            <Link href={dashboardHref} className="font-semibold text-teal hover:underline">
              {dashboardLabel}
            </Link>
            <form action={customerLogoutAction}>
              <button type="submit" className="font-semibold text-coral-dark hover:underline">
                {dict.logout}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-ink-soft">
            <Link href="/redeem" className="font-semibold text-teal hover:underline">
              {dict.redeemVoucher}
            </Link>
            <Link href="/login" className="font-semibold text-teal hover:underline">
              {dict.login}
            </Link>
            <Link href="/agent/register" className="font-semibold text-coral-dark hover:underline">
              {dict.becomeAgent}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
