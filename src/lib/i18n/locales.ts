/**
 * Indonesian language support (confirmed directly, not in the spec):
 * separate /id/... web addresses so an Indonesian page is its own
 * shareable, bookmarkable, Google-indexable link -- English stays at
 * today's existing addresses (nothing already shared/bookmarked/
 * indexed breaks), Indonesian gets an /id prefix on top. English is
 * the site's language by default -- every first-time visitor lands on
 * it regardless of their browser's language, and only switches to
 * Indonesian when they explicitly pick it via the switcher (see
 * src/proxy.ts), which then sticks for future visits.
 *
 * This is being built page by page, not all at once -- only pages
 * listed as "localized" somewhere (see proxy.ts's LOCALIZED_PATHS) have
 * an actual /id/... version. Everything else still only exists in
 * English, even when reached by clicking through from an /id page.
 */
export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

/** Remembers a visitor's explicit or detected language choice so it
 * sticks across visits -- 1 year, same "long-lived preference cookie"
 * shape as the referral cookie elsewhere in proxy.ts, just longer-lived
 * since a language choice isn't a 30-day marketing attribution window. */
export const LOCALE_COOKIE_NAME = "site_locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
