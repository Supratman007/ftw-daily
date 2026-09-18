import Link from "next/link";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT_LABELS, type Locale } from "@/lib/i18n/locales";

function hrefFor(locale: Locale, basePath: string): string {
  if (locale === "en") {
    // ?lang=en overrides a previously-stored "id" cookie -- without
    // it, landing back on the bare path with that cookie still set
    // would just bounce straight back to /id (see proxy.ts). Visiting
    // /id directly doesn't have the equivalent problem (it's never a
    // redirect target itself), so only this direction needs it.
    return `${basePath}${basePath.includes("?") ? "&" : "?"}lang=en`;
  }
  return basePath === "/" ? "/id" : `/id${basePath}`;
}

/**
 * Swaps between the English (unprefixed) and Indonesian (/id-prefixed)
 * versions of the *same* page. `basePath` is that page's own path with
 * no locale prefix (e.g. "/" for the homepage) -- only render this on
 * a page that actually has both versions; linking to an /id page that
 * doesn't exist yet would just 404.
 *
 * A globe icon plus short "EN"/"ID" codes rather than the full language
 * names -- spelling out "English"/"Bahasa Indonesia" in a bordered pill
 * took up real width in the header next to the login/account links.
 * The full name is still there for anyone who needs it, as each
 * option's title/aria-label. Still a bordered pill (own background,
 * own border) rather than plain text -- sitting right above a photo
 * banner on some pages, plain text in the page's ink color nearly
 * disappeared against a busy image, and a solid background stays
 * legible over any photo, same reasoning as the status-filter pills
 * elsewhere in the admin.
 */
export function LocaleSwitcher({ locale, basePath }: { locale: Locale; basePath: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-sand-deep bg-white p-1 pl-2 text-xs font-semibold shadow-sm">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-ink-soft"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" />
      </svg>
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={hrefFor(l, basePath)}
          title={LOCALE_LABELS[l]}
          aria-label={LOCALE_LABELS[l]}
          aria-current={l === locale ? "true" : undefined}
          className={
            l === locale
              ? "rounded-full bg-teal px-2 py-1 text-white"
              : "rounded-full px-2 py-1 text-ink-soft hover:bg-sand hover:text-ink"
          }
        >
          {LOCALE_SHORT_LABELS[l]}
        </Link>
      ))}
    </div>
  );
}
