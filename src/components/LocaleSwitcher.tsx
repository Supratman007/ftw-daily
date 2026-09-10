import Link from "next/link";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";

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
 * Styled as a bordered pill group (own background, own border) rather
 * than plain text -- sitting right above a photo banner, plain text in
 * the page's ink color nearly disappeared against a busy image. A
 * solid-background pill stays legible over any photo, same reasoning
 * as the status-filter pills elsewhere in the admin.
 */
export function LocaleSwitcher({ locale, basePath }: { locale: Locale; basePath: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-sand-deep bg-white p-1 text-xs font-semibold shadow-sm">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={hrefFor(l, basePath)}
          className={
            l === locale
              ? "rounded-full bg-teal px-3 py-1 text-white"
              : "rounded-full px-3 py-1 text-ink-soft hover:bg-sand hover:text-ink"
          }
        >
          {LOCALE_LABELS[l]}
        </Link>
      ))}
    </div>
  );
}
