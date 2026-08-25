import { tryPhpUnserialize } from "./php-unserialize";
import type { WordpressServiceType } from "./client";

/** Custom fields come back from WordPress as single-element string arrays
 * (standard WP get_post_meta shape) -- e.g. `"adult_price": ["555"]`. This
 * unwraps that, returning undefined for a missing/empty field rather than
 * throwing, since most of these are optional depending on product type. */
function metaStr(fields: Record<string, unknown>, key: string): string | undefined {
  const value = fields[key];
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const first = value[0];
  if (typeof first !== "string" || first === "") return undefined;
  return first;
}

function metaNum(fields: Record<string, unknown>, key: string): number | undefined {
  const str = metaStr(fields, key);
  if (str === undefined) return undefined;
  const n = Number(str);
  return Number.isFinite(n) ? n : undefined;
}

/** WordPress stores each product's location tags as a string like
 * "_2319_,_3327_,_3331_" -- underscore-wrapped IDs, comma-separated.
 * This is specific to this WordPress site's data, not a standard format. */
function parseLocationIds(fields: Record<string, unknown>): number[] {
  const raw = metaStr(fields, "multi_location");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^_+|_+$/g, ""))
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n));
}

/** The detail endpoint doesn't include a URL/slug -- we get that from the
 * list endpoint instead (which does), e.g.
 * ".../st_tour/secret-gili-islands-snorkeling-tour/" -> the last segment. */
export function slugFromWpUrl(url: string): string {
  const segments = url.replace(/\/+$/, "").split("/");
  return segments[segments.length - 1] || url;
}

/** Rinjani's request-to-book flow isn't built until Phase 2 (see the
 * spec's §6b and the project's Phase 1 scope). Nothing in the WordPress
 * data reliably flags this at the product level (every product currently
 * carries the same booking-option value, since the whole site sells via
 * WhatsApp enquiry today) -- so this is a deliberate, simple name match
 * instead. Revisit with a real WordPress-side tag once Phase 2 needs one. */
export function isRinjaniProduct(title: string, slug: string): boolean {
  const needle = /rinjani/i;
  return needle.test(title) || needle.test(slug);
}

export interface TransformedProduct {
  wp_post_id: number;
  wp_type: "tour" | "activity";
  slug: string;
  title: string;
  excerpt: string | null;
  description_html: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  duration_label: string | null;
  adult_price_usd: number | null;
  child_price_usd: number | null;
  infant_price_usd: number | null;
  min_people: number | null;
  max_people: number | null;
  includes: string | null;
  excludes: string | null;
  highlights: string | null;
  itinerary: unknown;
  faq: unknown;
  lat: number | null;
  lng: number | null;
  is_bookable: boolean;
  location_wp_ids: number[];
}

/**
 * Converts one raw WordPress detail record into our normalized shape.
 * `wpType` selects which of the type-specific field names to read
 * (Tours use `tours_*`/`duration_day`, Activities use `activity_*`/
 * `duration` -- confirmed against real records, not assumed).
 */
export function transformWpProduct(
  serviceType: WordpressServiceType,
  wpPostId: number,
  listUrl: string,
  fields: Record<string, unknown>
): TransformedProduct {
  const wpType: "tour" | "activity" = serviceType === "tours" ? "tour" : "activity";
  const prefix = wpType === "tour" ? "tours" : "activity";

  const title = String(fields.title ?? "");
  const slug = slugFromWpUrl(listUrl);

  const rawGallery = fields.gallery;
  const galleryUrls = Array.isArray(rawGallery)
    ? rawGallery.filter((g): g is string => typeof g === "string")
    : [];

  return {
    wp_post_id: wpPostId,
    wp_type: wpType,
    slug,
    title,
    excerpt: (fields.excerpt as string) || null,
    description_html: (fields.description as string) || null,
    cover_image_url: (fields.image as string) || null,
    gallery_urls: galleryUrls,
    duration_label: metaStr(fields, wpType === "tour" ? "duration_day" : "duration") ?? null,
    adult_price_usd: metaNum(fields, "adult_price") ?? null,
    child_price_usd: metaNum(fields, "child_price") ?? null,
    infant_price_usd: metaNum(fields, "infant_price") ?? null,
    min_people: metaNum(fields, "min_people") ?? null,
    max_people: metaNum(fields, "max_people") ?? null,
    includes: metaStr(fields, `${prefix}_include`) ?? null,
    excludes: metaStr(fields, `${prefix}_exclude`) ?? null,
    highlights: metaStr(fields, `${prefix}_highlight`) ?? null,
    itinerary: tryPhpUnserialize(metaStr(fields, `${prefix}_program`)) ?? null,
    faq: tryPhpUnserialize(metaStr(fields, `${prefix}_faq`)) ?? null,
    lat: metaNum(fields, "map_lat") ?? null,
    lng: metaNum(fields, "map_lng") ?? null,
    is_bookable: !isRinjaniProduct(title, slug),
    location_wp_ids: parseLocationIds(fields),
  };
}
