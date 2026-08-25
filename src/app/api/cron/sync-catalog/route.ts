import { NextRequest, NextResponse } from "next/server";
import { syncCatalog } from "@/lib/sync/syncCatalog";

// Without this, Vercel gives the function a short default window (as low
// as 10s on some plans) before force-killing it -- too little time to
// fetch every tour/activity one by one as the catalog grows. A killed
// function can't run cleanup code, so a run cut off this way leaves its
// catalog_sync_runs row stuck at "running" forever with no error logged.
export const maxDuration = 60;

// Vercel Cron calls this on a schedule (see vercel.json). It sends a
// GET request with `Authorization: Bearer <CRON_SECRET>` automatically --
// checking that header is what stops anyone else on the internet from
// triggering our sync job by just guessing this URL.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if it's not configured yet
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncCatalog();
    const httpStatus = summary.status === "failed" ? 500 : 200;
    return NextResponse.json(summary, { status: httpStatus });
  } catch (err) {
    // A failure here means something broke before/outside the
    // per-product error handling inside syncCatalog itself (e.g. Supabase
    // unreachable) -- still respond with a clear error rather than a
    // raw 500 with no explanation.
    return NextResponse.json(
      { status: "failed", error: (err as Error).message },
      { status: 500 }
    );
  }
}
