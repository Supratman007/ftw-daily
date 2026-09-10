import type { Instrumentation } from "next";
import { recordErrorAndMaybeAlert } from "@/lib/alerts/errorAlerts";

/**
 * Server-side half of error alerting (spec's "find out automatically,
 * not from a customer complaint" requirement). Next.js calls this for
 * every uncaught error it captures from a Server Component render, a
 * Route Handler, a Server Action, or proxy.ts itself -- see
 * src/lib/alerts/errorAlerts.ts for what happens next (an email to
 * every active admin, throttled so one broken page doesn't flood an
 * inbox) and src/instrumentation-client.ts for the browser-side half.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, _request, context) => {
  const message = err instanceof Error ? err.message : String(err);
  await recordErrorAndMaybeAlert({
    source: "server",
    message,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
