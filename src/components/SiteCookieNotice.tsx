import { CookieNotice } from "@/components/CookieNotice";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/** Resolves the translated copy server-side (CookieNotice itself is a
 * client component and can't call getDictionary), same split as every
 * other client-island-with-translated-copy in this app. */
export function SiteCookieNotice({ locale = DEFAULT_LOCALE }: { locale?: Locale } = {}) {
  const dict = getDictionary(locale).cookieNotice;
  const pathPrefix = locale === "id" ? "/id" : "";

  return (
    <CookieNotice
      message={dict.message}
      learnMoreHref={`${pathPrefix}/privacy`}
      learnMoreLabel={dict.learnMore}
      acceptLabel={dict.accept}
    />
  );
}
