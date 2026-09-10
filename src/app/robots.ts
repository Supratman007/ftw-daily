import type { MetadataRoute } from "next";

/**
 * Next.js's file-convention route -- this file alone makes /robots.txt
 * exist and serve the object below, no separate static file needed.
 * Blocks the staff-only admin/agent panels and the customer account
 * area (all auth-walled anyway, so a crawler could never see anything
 * there, but keeping them out of a crawler's queue entirely is still
 * the polite, standard thing to do) and the API routes (not pages at
 * all). Everything else -- the homepage, trip pages, login, redeem,
 * both languages -- stays open, matching the sitemap below.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/agent", "/account", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
