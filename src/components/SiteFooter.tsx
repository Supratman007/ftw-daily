import Link from "next/link";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * Small, simple footer -- Privacy Policy and Terms of Service links,
 * the one place on the site either of those pages is actually linked
 * from. Dropped into the same customer-facing pages as SiteHeader.
 */
export function SiteFooter({ locale = DEFAULT_LOCALE }: { locale?: Locale } = {}) {
  const dict = getDictionary(locale).footer;
  const pathPrefix = locale === "id" ? "/id" : "";

  return (
    <footer className="mt-16 border-t border-sand-deep bg-white px-6 py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4 text-xs text-ink-soft">
        <Link href={`${pathPrefix}/privacy`} className="hover:text-ink hover:underline">
          {dict.privacyPolicy}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href={`${pathPrefix}/terms`} className="hover:text-ink hover:underline">
          {dict.termsOfService}
        </Link>
      </div>
    </footer>
  );
}
