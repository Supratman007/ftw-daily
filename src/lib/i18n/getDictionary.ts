import "server-only";
import { en } from "./dictionaries/en";
import { id } from "./dictionaries/id";
import type { Locale } from "./locales";

const dictionaries = { en, id };

/** Server Components only -- reads the pre-built dictionary object for
 * a locale (no dynamic import needed; there are only two, and this
 * whole app already ships everything server-side per page). */
export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
