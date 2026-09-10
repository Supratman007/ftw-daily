import { NextRequest, NextResponse } from "next/server";
import { recordErrorAndMaybeAlert } from "@/lib/alerts/errorAlerts";

/**
 * Receives the beacon src/instrumentation-client.ts fires when a
 * visitor's browser hits an uncaught error -- the client-side half of
 * error alerting (see src/instrumentation.ts for the server half).
 * Never throws and always returns 200, same "a reporting hiccup must
 * never surface to a visitor" philosophy as /api/track.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : null;
    const routePath = typeof body?.routePath === "string" ? body.routePath : null;
    if (!message) return NextResponse.json({ ok: true });

    await recordErrorAndMaybeAlert({
      source: "client",
      message,
      routePath,
      routeType: "client",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Client error reporting failed:", err);
    return NextResponse.json({ ok: true });
  }
}
