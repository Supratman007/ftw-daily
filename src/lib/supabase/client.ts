import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in the browser (Client Components). Uses the
 * public anon key — safe to expose, since access is controlled by Row
 * Level Security policies on each table, not by keeping this key secret.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
