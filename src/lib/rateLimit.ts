import "server-only";
import { headers } from "next/headers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

/**
 * Best-effort client IP for rate limiting. x-forwarded-for's first
 * entry is the real visitor IP as set by Vercel's edge; falls back to
 * a shared "unknown" bucket (e.g. local dev, or a header some other
 * host doesn't set) rather than throwing -- worst case that bucket
 * hits its own limit a bit early, which beats every request silently
 * skipping the check entirely.
 */
async function clientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

/**
 * Returns true if this request may proceed, false if the caller
 * should reject it. `scope` namespaces the limit per form/flow (e.g.
 * "signup", "checkout") so abuse on one doesn't spend another's
 * budget for the same visitor -- see check_rate_limit() in migration
 * 0047 for the actual counting.
 *
 * Fails open (allows the request) if the database call itself errors
 * -- a rate-limit outage should never be the reason a real customer
 * can't book a trip or create an account.
 */
export async function checkRateLimit(
  scope: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<boolean> {
  const ip = await clientIp();
  const serviceClient = createSupabaseServiceRoleClient();
  const { data, error } = await serviceClient.rpc("check_rate_limit", {
    p_key: `${scope}:${ip}`,
    p_max_attempts: maxAttempts,
    p_window_minutes: windowMinutes,
  });

  if (error) {
    console.error(`checkRateLimit(${scope}) failed, failing open:`, error.message);
    return true;
  }
  return Boolean(data);
}
