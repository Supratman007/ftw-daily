import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the SERVICE ROLE key — bypasses Row Level Security
 * entirely. Only ever use this from trusted server-only code that never
 * runs in the browser: the WordPress catalog sync job, Xendit webhook
 * handlers, and similar background/system tasks.
 *
 * Never import this from a Client Component, and never expose
 * SUPABASE_SERVICE_ROLE_KEY via a NEXT_PUBLIC_ variable.
 */
export function createSupabaseServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
