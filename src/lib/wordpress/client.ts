/**
 * A thin client for adventure-lombok.com's "Traveler" theme REST API.
 *
 * Confirmed by hand against the live site before writing this (see the
 * conversation history / commit messages for the investigation):
 *  - Base: https://adventure-lombok.com/wp-json/traveler
 *  - No API key or login needed for these read-only catalog routes.
 *  - List:   /services/{typeSlug}?orderby=&order=&posts_per_page=&paged=
 *  - Detail: /services/{typeSlug}/{id}
 *  - typeSlug for Tours is "tours" (plural); for Activities it's
 *    "activity" (singular) -- confirmed inconsistent, not a typo here.
 *  - Every successful response is shaped { success: true, data: ... }.
 *    A miss (wrong slug, missing id) comes back as
 *    { success: false, notice: "Not Found" } with HTTP 200, not a 404 --
 *    so callers must check `success`, not just the HTTP status.
 */

const WORDPRESS_API_BASE_URL =
  process.env.WORDPRESS_API_BASE_URL ?? "https://adventure-lombok.com/wp-json/traveler";

export type WordpressServiceType = "tours" | "activity";

export interface WpListItem {
  ID: number;
  url: string;
  title: string;
  image: string;
  excerpt: string;
}

interface WpListResponse {
  success: boolean;
  data?: WpListItem[];
  notice?: string;
}

interface WpDetailResponse {
  success: boolean;
  // WordPress wraps the single record in a one-element array.
  data?: Record<string, unknown>[];
  notice?: string;
}

class WordpressApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "WordpressApiError";
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${WORDPRESS_API_BASE_URL}${path}`;
  let response: Response;
  try {
    // WordPress isn't always fast; give it real room before giving up so
    // a slow moment on the source site doesn't look like a broken sync.
    response = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    throw new WordpressApiError(`Network error fetching ${url}`, err);
  }
  if (!response.ok) {
    throw new WordpressApiError(`HTTP ${response.status} fetching ${url}`);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new WordpressApiError(`Invalid JSON from ${url}`, err);
  }
  return json as T;
}

/** One page of list results. WordPress returns success:false/"Not Found"
 * once you page past the last result -- callers should treat that as an
 * empty page (end of list), not an error. */
export async function fetchServiceListPage(
  type: WordpressServiceType,
  page: number,
  perPage = 50
): Promise<WpListItem[]> {
  const path = `/services/${type}?orderby=date&order=DESC&posts_per_page=${perPage}&paged=${page}`;
  const json = await fetchJson<WpListResponse>(path);
  if (!json.success) return [];
  return json.data ?? [];
}

/** Fetches every page for a service type. Stops as soon as a page comes
 * back short of `perPage` items, or empty. */
export async function fetchAllServiceListItems(
  type: WordpressServiceType,
  perPage = 50
): Promise<WpListItem[]> {
  const all: WpListItem[] = [];
  let page = 1;
  // A hard ceiling so a bug on either side (ours or WordPress's) can never
  // turn into an infinite loop against a live site.
  const MAX_PAGES = 100;
  while (page <= MAX_PAGES) {
    const items = await fetchServiceListPage(type, page, perPage);
    all.push(...items);
    if (items.length < perPage) break;
    page += 1;
  }
  return all;
}

/** Full detail record for one product. Returns null (not a throw) for a
 * confirmed "Not Found" -- that's an expected outcome (e.g. the item was
 * deleted between the list call and this one), not a sync failure. */
export async function fetchServiceDetail(
  type: WordpressServiceType,
  id: number
): Promise<Record<string, unknown> | null> {
  const json = await fetchJson<WpDetailResponse>(`/services/${type}/${id}`);
  if (!json.success || !json.data || json.data.length === 0) return null;
  return json.data[0];
}
