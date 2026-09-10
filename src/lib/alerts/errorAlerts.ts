import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { sendErrorAlertEmail } from "@/lib/email/resend";

/** How long to stay quiet about the *same* underlying error before
 * emailing again -- every occurrence is still counted (see the
 * record_error_alert migration), only the email is throttled. Without
 * this, one broken page hit by ten visitors in a few minutes would
 * mean ten emails instead of one. */
const ALERT_COOLDOWN_MINUTES = 30;

/** Small, dependency-free hash (djb2) that groups "the same error" into
 * one signature -- deliberately not node:crypto, so this file stays
 * safe to call from either the Node.js or Edge runtime (instrumentation.ts
 * can run in either, per Next.js's own docs). Doesn't need to be
 * cryptographically strong, just stable and cheap. */
function hashSignature(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export interface CaughtError {
  source: "server" | "client";
  message: string;
  routePath?: string | null;
  routeType?: string | null;
}

/**
 * The one place every error in the app -- server or client -- funnels
 * through (instrumentation.ts's onRequestError for server errors,
 * /api/client-error for browser errors). Records it, and emails every
 * active admin unless this exact error already triggered an email
 * within the cooldown window.
 *
 * Never throws -- same "a reporting hiccup must never become a second,
 * worse error" philosophy as sendEmail() in resend.ts.
 */
export async function recordErrorAndMaybeAlert(err: CaughtError): Promise<void> {
  try {
    const message = err.message.slice(0, 500);
    const signature = hashSignature(
      `${err.source}:${err.routeType ?? ""}:${err.routePath ?? ""}:${message.slice(0, 150)}`
    );

    const serviceClient = createSupabaseServiceRoleClient();
    const { data: rows, error: rpcError } = await serviceClient.rpc("record_error_alert", {
      p_signature: signature,
      p_source: err.source,
      p_message: message,
      p_route_path: err.routePath ?? null,
      p_route_type: err.routeType ?? null,
      p_cooldown_minutes: ALERT_COOLDOWN_MINUTES,
    });

    if (rpcError) {
      console.error("record_error_alert failed:", rpcError.message);
      return;
    }

    const result = rows?.[0];
    if (!result?.should_alert) return;

    const { data: admins } = await serviceClient
      .from("admin_users")
      .select("email")
      .eq("status", "active");
    if (!admins || admins.length === 0) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await Promise.all(
      admins.map((admin) =>
        sendErrorAlertEmail({
          toEmail: admin.email,
          source: err.source,
          message,
          routePath: err.routePath,
          routeType: err.routeType,
          occurrenceCount: result.occurrence_count,
          siteUrl,
        })
      )
    );
  } catch (alertErr) {
    console.error("Error alert pipeline itself failed:", alertErr);
  }
}
