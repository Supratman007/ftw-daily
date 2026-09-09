import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "@/lib/agents/referralCookie";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  type Locale,
} from "@/lib/i18n/locales";

// Bare (English) path patterns that also have a translated version at
// /id + the same path -- only these are eligible for the auto-detect
// redirect below. Redirecting a path with no /id counterpart yet would
// just 404, so this list is deliberately explicit and grows as more
// customer pages get an Indonesian version. The admin/agent panels are
// never in here -- staff stay on English regardless of browser
// language.
const LOCALIZED_PATH_PATTERNS: RegExp[] = [
  /^\/$/, // homepage
  /^\/p\/[^/]+$/, // /p/[slug] -- the trip/product page
  /^\/p\/[^/]+\/request$/, // manual-confirmation request form
  /^\/confirmation\/[^/]+$/, // booking confirmation
];

function isLocalizedPath(pathname: string): boolean {
  return LOCALIZED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function parseLocaleCookie(value: string | undefined): Locale | undefined {
  return value === "en" || value === "id" ? value : undefined;
}

function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (header && header.toLowerCase().includes("id")) return "id";
  return DEFAULT_LOCALE;
}

function parseExplicitLocaleParam(value: string | null): Locale | undefined {
  return value === "en" || value === "id" ? value : undefined;
}

/**
 * Runs before every request (except static assets/api). Three unrelated
 * jobs share this file since Next.js only allows one:
 *
 * 1. Referral attribution: an agent's link/QR code points at
 *    `?ref=CODE`, which could land on any page, not just the homepage
 *    -- capture it into a 30-day cookie here so it survives however
 *    many pages the visitor browses before actually checking out
 *    (checkout itself, in /p/[slug]/actions.ts, is what looks the code
 *    up and decides whether it's real). Cheap -- just reading a query
 *    param, no DB round trip -- so it runs on every non-admin request.
 *
 * 2. Indonesian language auto-detect: a first-time visitor on a page
 *    matching LOCALIZED_PATH_PATTERNS gets redirected straight to its /id
 *    version if their browser's Accept-Language says Indonesian.
 *    Whatever they land on (by detection, by an explicit switcher
 *    click, or by opening an /id link directly) gets remembered in a
 *    1-year cookie, so a later visit to the bare English path respects
 *    their actual preference instead of re-detecting every time.
 *    LocaleSwitcher's links carry a `?lang=en`/`?lang=id` override so
 *    switching *to* English actually works -- without it, a visitor
 *    whose cookie already says "id" clicking "English" would land back
 *    on "/", see the stored "id" preference, and get bounced straight
 *    back to /id before the English page ever rendered.
 *
 * 3. The *fast* "is someone logged in at all" check for /admin routes,
 *    using Supabase's own session cookie. It deliberately does NOT
 *    check the admin_users table (a database round trip, which Next.js's
 *    own guidance says to avoid here since this runs on every
 *    navigation, including prefetches) -- the real check ("is this
 *    logged-in person actually an active admin") happens in
 *    src/lib/admin/auth.ts's requireAdmin(), called from the protected
 *    layout and every admin Server Action. This is a fast door, not the
 *    lock.
 */
export async function proxy(request: NextRequest) {
  const refCode = request.nextUrl.searchParams.get("ref");
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    const isIdPath = pathname === "/id" || pathname.startsWith("/id/");
    const storedLocale = parseLocaleCookie(request.cookies.get(LOCALE_COOKIE_NAME)?.value);
    const explicitLocale = parseExplicitLocaleParam(request.nextUrl.searchParams.get("lang"));
    // An explicit switcher click always wins over whatever was stored
    // before -- that's the whole point of it existing.
    const cookieLocale = explicitLocale ?? storedLocale;

    if (!isIdPath && isLocalizedPath(pathname)) {
      const preferredLocale =
        cookieLocale ?? detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));
      if (preferredLocale === "id") {
        const url = request.nextUrl.clone();
        url.pathname = `/id${pathname === "/" ? "" : pathname}`;
        const response = NextResponse.redirect(url);
        response.cookies.set(LOCALE_COOKIE_NAME, "id", {
          maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
          path: "/",
          sameSite: "lax",
        });
        if (refCode) {
          response.cookies.set(REFERRAL_COOKIE_NAME, refCode, {
            maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
            path: "/",
            sameSite: "lax",
          });
        }
        return response;
      }
    }

    const response = NextResponse.next();
    if (refCode) {
      response.cookies.set(REFERRAL_COOKIE_NAME, refCode, {
        maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
      });
    }
    // Record whichever locale this request actually landed on, so the
    // next visit to a bare (unprefixed) path skips detection and just
    // honors the remembered choice. An explicit switcher click always
    // gets persisted, even if it matches where the URL already put the
    // visitor (e.g. clicking "English" while already on "/").
    const localeToPersist = explicitLocale ?? (isIdPath ? "id" : !storedLocale ? "en" : undefined);
    if (localeToPersist && localeToPersist !== storedLocale) {
      response.cookies.set(LOCALE_COOKIE_NAME, localeToPersist, {
        maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() (not getSession()) -- it validates the token against
  // Supabase's own server instead of trusting whatever's in the cookie,
  // which matters since this decision gates access to the admin area.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Everything except static assets and API routes -- referral links
  // can point anywhere, and the webhook route has no cookies to set.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
