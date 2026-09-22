import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ProductMeta {
  title: string;
  title_id: string | null;
  excerpt: string | null;
  excerpt_id: string | null;
  translation_status: "none" | "draft" | "approved";
  cover_image_url: string | null;
}

/**
 * A lightweight product lookup for generateMetadata() (src/app/p/[slug]
 * and src/app/id/p/[slug]) -- separate from ProductPage.tsx's own
 * "select *" fetch since Next.js runs generateMetadata and the page
 * component independently and doesn't share their data automatically.
 * Wrapped in cache() so calling this from both the English and
 * Indonesian entrypoint's generateMetadata (they render as separate
 * requests, so this doesn't dedupe across locales, only within one
 * request) costs nothing extra beyond the query itself.
 */
export const getProductMeta = cache(async (slug: string): Promise<ProductMeta | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("title, title_id, excerpt, excerpt_id, translation_status, cover_image_url")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data;
});
