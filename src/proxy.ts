import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every /admin request. This is only the *fast* check —
 * "is someone logged in at all" — using Supabase's own session cookie.
 * It deliberately does NOT check the admin_users table (that needs a
 * database round trip, which Next.js's own guidance says to avoid here
 * since this runs on every navigation, including prefetches).
 *
 * The real check — "is this logged-in person actually an active admin"
 * — happens in src/lib/admin/auth.ts's requireAdmin(), called from the
 * protected layout and from every admin Server Action. This proxy check
 * is a fast door, not the lock.
 */
export async function proxy(request: NextRequest) {
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
  matcher: ["/admin/:path*"],
};
