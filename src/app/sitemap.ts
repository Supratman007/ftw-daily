import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Next.js's file-convention route -- this file alone makes /sitemap.xml
 * exist, no separate static file to keep in sync by hand. Regenerated
 * on each request (Next.js caches/revalidates it like any other route),
 * so a newly published trip shows up here without a redeploy. Covers
 * the actual content worth a search engine finding -- the homepage and
 * every active trip, in both languages -- not transactional pages like
 * login or checkout, which have nothing to rank for and no reason to
 * be crawled.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("status", "active");

  const entries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/id`, changeFrequency: "weekly", priority: 1 },
  ];

  for (const p of products ?? []) {
    const lastModified = new Date(p.updated_at);
    entries.push(
      { url: `${siteUrl}/p/${p.slug}`, lastModified, changeFrequency: "weekly", priority: 0.8 },
      { url: `${siteUrl}/id/p/${p.slug}`, lastModified, changeFrequency: "weekly", priority: 0.8 }
    );
  }

  return entries;
}
