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

/**
 * Builds a full per-page Metadata object -- title, description,
 * hreflang alternates (via localizedAlternates above), Open Graph, and
 * a matching Twitter Card -- so every page gets its own search-result
 * and link-preview text instead of every page on the site sharing
 * root layout.tsx's one static title/description (the gap this was
 * written to close). `path` is this specific page's own full path
 * (e.g. "/id/about"); `enPath`/`idPath` are both locale versions' full
 * paths, same as localizedAlternates expects. `imageUrl` is optional
 * and can be relative (resolved against layout.tsx's metadataBase) or
 * absolute -- omit it entirely rather than pointing at a placeholder
 * when a page has no real photo yet.
 */
export function pageMetadata({
  title,
  description,
  path,
  enPath,
  idPath,
  imageUrl,
}: {
  title: string;
  description: string;
  path: string;
  enPath: string;
  idPath: string;
  imageUrl?: string | null;
}): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const images = imageUrl ? [{ url: imageUrl }] : undefined;
  const isIndonesian = path === idPath;

  return {
    title,
    description,
    alternates: localizedAlternates(enPath, idPath),
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path}`,
      siteName: "Adventure Lombok Booking",
      locale: isIndonesian ? "id_ID" : "en_US",
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}
