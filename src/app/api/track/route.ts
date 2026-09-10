import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { VISITOR_COOKIE_NAME, VISITOR_COOKIE_MAX_AGE_SECONDS } from "@/lib/analytics/visitorCookie";

// Cheap, deliberately non-exhaustive -- this isn't trying to stop a
// determined scraper, just avoid counting the common, well-behaved
// crawlers (search engines, SEO tools, uptime monitors) that do
// identify themselves. Anything not caught here still gets filtered
// out for free by the bigger fact that this route is only ever called
// from client-side JS (see PageViewTracker.tsx's doc comment) -- most
// bots never run it at all.
const BOT_USER_AGENT_SUBSTRINGS = [
  "bot",
  "spider",
  "crawl",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "headlesschrome",
  "phantomjs",
  "monitor",
  "pingdom",
  "uptime",
];

function looksLikeBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // A real browser always sends one.
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENT_SUBSTRINGS.some((s) => ua.includes(s));
}

/**
 * Receives the beacon PageViewTracker.tsx fires once a real browser has
 * rendered a customer-facing page. Never throws and always returns 200
 * -- a tracking hiccup should never surface as an error to a visitor,
 * same "log it, don't let it break anything" philosophy as
 * src/lib/email/resend.ts's sendEmail.
 */
export async function POST(request: NextRequest) {
  try {
    if (looksLikeBot(request.headers.get("user-agent"))) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json().catch(() => null);
    const path = typeof body?.path === "string" ? body.path : null;
    const locale = body?.locale === "id" ? "id" : "en";
    const referrer = typeof body?.referrer === "string" ? body.referrer : null;

    // Reject anything that isn't a plausible in-app path rather than
    // trying to validate it precisely -- junk here is cheap to ignore
    // and not worth a real error response.
    if (!path || !path.startsWith("/") || path.length > 500) {
      return NextResponse.json({ ok: true });
    }

    let referrerHost: string | null = null;
    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const siteHost = new URL(request.url).host;
        // Only an *external* referrer is a useful "where did this
        // visitor come from" signal -- internal navigation between our
        // own pages isn't a traffic source.
        if (referrerUrl.host !== siteHost) referrerHost = referrerUrl.host;
      } catch {
        // Malformed referrer -- ignore, not worth failing over.
      }
    }

    const existingVisitorId = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    const visitorId = existingVisitorId || crypto.randomUUID();

    const serviceClient = createSupabaseServiceRoleClient();
    await serviceClient.from("page_views").insert({
      path,
      locale,
      referrer_host: referrerHost,
      visitor_id: visitorId,
    });

    const response = NextResponse.json({ ok: true });
    if (!existingVisitorId) {
      response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
        maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  } catch (err) {
    console.error("Page view tracking failed:", err);
    return NextResponse.json({ ok: true });
  }
}
