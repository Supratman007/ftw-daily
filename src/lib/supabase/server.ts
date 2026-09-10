import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads/writes the visitor's auth session via cookies, so it only
 * ever sees what that logged-in user is allowed to see (enforced by
 * Supabase Row Level Security policies on each table).
 *
 * Do NOT use this for admin product-management writes or other
 * behind-the-scenes tasks — those need admin-level access. Use
 * `createServiceRoleClient` from `./service.ts` for that instead.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component in some cases, where
            // cookies can't be written. That's fine as long as middleware
            // is also refreshing the session (we'll add that with auth).
          }
        },
      },
    }
  );
}
