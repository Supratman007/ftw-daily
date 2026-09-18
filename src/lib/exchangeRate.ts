import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_USD_TO_IDR_RATE } from "@/lib/currency";

/**
 * The live USD->IDR rate, read from app_settings (migration 0046,
 * admin-editable at /admin/settings) and cached per request with
 * React's cache() -- same pattern as requireAdmin() in
 * lib/admin/auth.ts -- so a page pricing several products (the
 * homepage's trip grid, say) only hits the database once no matter how
 * many times it's called during that render.
 *
 * Falls back to DEFAULT_USD_TO_IDR_RATE if the row is missing or the
 * query errors, rather than throwing -- a settings-table hiccup should
 * never take down checkout or every priced page on the site.
 *
 * "server-only" (and living outside currency.ts) because this needs
 * the Supabase server client, which pulls in next/headers -- importing
 * it from a "use client" component like TransportBookingForm would
 * break the build. Every actual call site here is already a Server
 * Component or Server Action.
 */
export const getUsdToIdrRate = cache(async (): Promise<number> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("app_settings")
      .select("usd_to_idr_rate")
      .eq("id", true)
      .maybeSingle();
    return data?.usd_to_idr_rate ?? DEFAULT_USD_TO_IDR_RATE;
  } catch {
    return DEFAULT_USD_TO_IDR_RATE;
  }
});
