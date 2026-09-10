"use client";

import { useEffect } from "react";

/**
 * Fires once, after a real browser has actually rendered a customer-
 * facing page -- deliberately client-side (not logged from the Server
 * Component render itself) so it only counts real visits, not Next.js
 * prefetching a linked page a visitor never opens, and not the many
 * simple bots/crawlers that never execute page JS at all. Dropped into
 * each customer-facing shared page component (HomePage, ProductPage,
 * LoginPage, ...) -- never into /admin or /agent pages, since staff
 * using their own panel isn't "website traffic."
 *
 * sendBeacon (when available) survives the page unloading right after
 * -- e.g. a visitor clicking straight through to another page -- better
 * than a normal fetch would.
 */
export function PageViewTracker({ path, locale }: { path: string; locale?: "en" | "id" }) {
  useEffect(() => {
    try {
      const payload = JSON.stringify({
        path,
        locale: locale ?? "en",
        referrer: document.referrer || null,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Never let a tracking failure show up as anything -- see
          // the route's own "always return ok" comment for why.
        });
      }
    } catch {
      // Same "this must never affect the actual page" reasoning.
    }
    // Re-fires on an actual path/locale change (a client-side Link
    // navigation between two pages using this same component), not on
    // every render.
  }, [path, locale]);

  return null;
}
