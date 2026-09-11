import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerLogoutAction } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { SiteNav, type SiteNavLink } from "@/components/SiteNav";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const accountLinkClass = "font-semibold text-teal hover:underline";
const accentLinkClass = "font-semibold text-coral-dark hover:underline";

/**
 * Compact top bar shared across every customer-facing page (homepage,
 * product pages, ...) -- without this, a page other than the homepage
 * had no login/account link at all, so a customer redirected back here
 * mid-checkout had no way to reach /account.
 *
 * `locale` defaults to English -- only pages with an actual Indonesian
 * version pass "id" explicitly. The logo, login, and redeem links are
 * locale-aware now that all three have /id versions; account/agent
 * still point at their English addresses regardless of locale, since
 * those pages don't have /id versions yet -- only their *labels*
 * translate so far.
 */
export async function SiteHeader({
  locale = DEFAULT_LOCALE,
  localeSwitcherBasePath,
}: {
  locale?: Locale;
  /** The current page's own path with no locale prefix (e.g. "/" for
   * the homepage, "/p/some-trip" for a product page) -- passed through
   * to LocaleSwitcher unchanged. Only pages that actually have both an
   * English and an Indonesian version pass this; when it's omitted, no
   * language switcher renders at all (same "don't link to a page that
   * doesn't exist yet" rule LocaleSwitcher itself already documents).
   * On desktop it shows inline in this header; on phones it shows
   * inside the hamburger menu (via SiteNav) instead, since the mobile
   * header is deliberately just the logo and one button. */
  localeSwitcherBasePath?: string;
} = {}) {
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

  // Home/Daily Tours/Daily Activities map onto real, always-populated
  // fields (the homepage itself, and the product_type filter it
  // already supports). Extension Trip/Komodo Trip/Bali Tours don't
  // have a dedicated field yet -- there's no "trip category" or
  // "destination" column, just free-text location/category -- so
  // those search by keyword instead via the homepage's existing `q`
  // text search (which already matches title, location and category).
  // They'll show "no trips found" until products with matching
  // location/category/title text exist, which is honest today and
  // starts working the moment that content is added, rather than a
  // dead link or a filter UI for categories that don't exist yet.
  const basePath = locale === "en" ? "/" : "/id";
  const browseLinks: SiteNavLink[] = [
    { href: basePath, label: dict.navHome },
    { href: `${basePath}?type=tour`, label: dict.navDailyTours },
    { href: `${basePath}?type=activity`, label: dict.navDailyActivities },
    { href: `${basePath}?q=${encodeURIComponent("Extension")}`, label: dict.navExtensionTrip },
    { href: `${basePath}?q=${encodeURIComponent("Komodo")}`, label: dict.navKomodoTrip },
    { href: `${basePath}?q=${encodeURIComponent("Bali")}`, label: dict.navBaliTours },
  ];

  // Login/redeem/become-an-agent (or, once signed in, account/
  // dashboard) -- rendered twice, same "desktop inline, mobile inside
  // the hamburger panel" split as browseLinks: once here as the
  // always-there desktop row (hidden on phones now, sm:flex), and
  // again passed into SiteNav so the mobile panel has them too. The
  // logout *form* can't be one of these plain {href,label} links (it
  // needs the "use server" action, not a client-navigable href), so it
  // goes through its own render + a separate prop.
  const redeemLink: SiteNavLink = { href: locale === "en" ? "/redeem" : "/id/redeem", label: dict.redeemVoucher };
  const accountLinks: SiteNavLink[] = user
    ? [redeemLink, { href: dashboardHref, label: dashboardLabel }]
    : [
        redeemLink,
        { href: locale === "en" ? "/login" : "/id/login", label: dict.login },
        { href: "/agent/register", label: dict.becomeAgent, variant: "accent" },
      ];
  const logoutForm = user ? (
    <form action={customerLogoutAction.bind(null, locale)}>
      <button type="submit" className={accentLinkClass}>
        {dict.logout}
      </button>
    </form>
  ) : null;
  const mobileLogoutSlot = user ? (
    <form action={customerLogoutAction.bind(null, locale)}>
      <button type="submit" className="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-coral-dark hover:bg-sand">
        {dict.logout}
      </button>
    </form>
  ) : null;

  // Desktop shows this inline in the header; phones get it inside the
  // hamburger panel instead (passed into SiteNav below) -- same split
  // as everything else in this header. Only renders at all when the
  // page passed a basePath, i.e. it actually has both locale versions.
  const localeSwitcher = localeSwitcherBasePath ? (
    <LocaleSwitcher locale={locale} basePath={localeSwitcherBasePath} />
  ) : null;

  return (
    <header className="relative flex flex-col gap-3 border-b border-sand-deep bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-6">
        <Link href={locale === "en" ? "/" : "/id"} className="flex shrink-0 items-center">
          <Image src="/logo.jpg" alt={dict.siteName} width={120} height={36} className="h-8 w-auto sm:h-9" preload />
        </Link>
        <SiteNav
          links={browseLinks}
          accountLinks={accountLinks}
          logoutSlot={mobileLogoutSlot}
          localeSwitcherSlot={localeSwitcher}
          openLabel={dict.openMenu}
          closeLabel={dict.closeMenu}
        />
      </div>
      {/* Desktop only now -- phones reach these same links (and
          logout) through the hamburger panel above instead, so the
          mobile header is just the logo and one button. */}
      <div className="hidden items-center gap-4 text-sm sm:flex">
        {localeSwitcher}
        <div className="flex flex-wrap items-center gap-3 text-ink-soft">
          {accountLinks.map((link) => (
            <Link key={link.href} href={link.href} className={link.variant === "accent" ? accentLinkClass : accountLinkClass}>
              {link.label}
            </Link>
          ))}
          {logoutForm}
        </div>
      </div>
    </header>
  );
}
