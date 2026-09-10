import Link from "next/link";
import Image from "next/image";
import { requireCustomer } from "@/lib/customers/auth";
import { customerLogoutAction } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Shared by src/app/account/layout.tsx (English) and
 * src/app/id/account/layout.tsx (Indonesian) -- same "thin route
 * wrapper around one locale-aware shared component" pattern as every
 * other paired page in this app. `requireCustomer` already sends an
 * unauthenticated visitor to the locale-correct login page (it reads
 * the /id/ prefix off the returnTo path), so the only other locale-
 * aware bit here is the nav labels and links themselves.
 */
export async function AccountShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const customer = await requireCustomer(`${pathPrefix}/account`);
  const dict = getDictionary(locale);
  const nav = dict.account.nav;

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex flex-col gap-3 border-b border-sand-deep bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={pathPrefix || "/"} className="flex shrink-0 items-center">
            <Image
              src="/logo.jpg"
              alt={dict.common.siteName}
              width={120}
              height={36}
              className="h-8 w-auto sm:h-9"
            />
          </Link>
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-serif text-sm font-semibold text-ocean">
            <Link href={`${pathPrefix}/account`}>{nav.overview}</Link>
            <Link href={`${pathPrefix}/account/bookings`}>{nav.myBookings}</Link>
            <Link href={`${pathPrefix}/account/messages`}>{nav.messages}</Link>
            <Link href={`${pathPrefix}/account/profile`}>{nav.profile}</Link>
            <Link href={`${pathPrefix}/redeem`}>{nav.redeemGift}</Link>
            <Link href={pathPrefix || "/"} className="text-coral-dark">
              {nav.bookATrip}
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <span>{customer.name || customer.email}</span>
          <form action={customerLogoutAction.bind(null, locale)}>
            <button type="submit" className="font-semibold text-coral-dark hover:underline">
              {dict.common.logout}
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
