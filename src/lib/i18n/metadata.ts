import type { Metadata } from "next";

/**
 * Builds the `alternates.languages` metadata Next.js needs to emit
 * `<link rel="alternate" hreflang="...">` tags -- tells Google "these
 * two URLs are the same page in two languages," so it can show an
 * Indonesian searcher the /id result instead of always surfacing the
 * English one. Part of why /id got its own real addresses in the
 * first place rather than picking a language silently -- a page
 * search engines can't tell apart isn't really "its own page."
 *
 * Pass the two versions' full paths (already locale-prefixed, e.g.
 * "/p/rinjani-trek" and "/id/p/rinjani-trek"); English is also the
 * `x-default` -- the version search engines fall back to for a
 * language/region they don't have a specific match for.
 */
export function localizedAlternates(enPath: string, idPath: string): Metadata["alternates"] {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    languages: {
      en: `${siteUrl}${enPath}`,
      id: `${siteUrl}${idPath}`,
      "x-default": `${siteUrl}${enPath}`,
    },
  };
}
