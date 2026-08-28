import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "@/lib/agents/referralCookie";

/**
 * Runs before every request (except static assets/api). Two unrelated
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
 * 2. The *fast* "is someone logged in at all" check for /admin routes,
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

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    if (refCode) {
      response.cookies.set(REFERRAL_COOKIE_NAME, refCode, {
        maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
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
