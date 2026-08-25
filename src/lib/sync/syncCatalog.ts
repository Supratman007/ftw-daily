import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import {
  fetchAllServiceListItems,
  fetchServiceDetail,
  type WordpressServiceType,
} from "@/lib/wordpress/client";
import { transformWpProduct } from "@/lib/wordpress/transform";

const SERVICE_TYPES: WordpressServiceType[] = ["tours", "activity"];

interface SyncError {
  serviceType: string;
  wpPostId?: number;
  message: string;
}

export interface SyncSummary {
  status: "success" | "partial" | "failed";
  productsSeen: number;
  productsUpserted: number;
  productsDeactivated: number;
  errors: SyncError[];
}

/** Ensures a `locations` row exists for a WordPress location ID, creating
 * a clearly-labeled placeholder if we haven't seen it before. We can't
 * read real location names from WordPress (see docs -- that endpoint
 * needs a login we don't have), so a person renames these once, by hand,
 * in Supabase -- cheap since new locations appear rarely. */
async function ensureLocationRow(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  wpLocationId: number,
  cache: Map<number, number>
): Promise<number> {
  const cached = cache.get(wpLocationId);
  if (cached !== undefined) return cached;

  const { data: existing } = await supabase
    .from("locations")
    .select("id")
    .eq("wp_location_id", wpLocationId)
    .maybeSingle();

  if (existing) {
    cache.set(wpLocationId, existing.id);
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from("locations")
    .insert({
      wp_location_id: wpLocationId,
      name: `Unnamed location (WP #${wpLocationId})`,
      slug: `wp-location-${wpLocationId}`,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(
      `Failed to create placeholder location for WP location #${wpLocationId}: ${error?.message}`
    );
  }
  cache.set(wpLocationId, inserted.id);
  return inserted.id;
}

/**
 * Pulls every Tour and Activity from adventure-lombok.com and upserts
 * them into our own database. Safe to call repeatedly (e.g. every 15
 * minutes via Vercel Cron, or by hand from /internal/sync-status): never
 * deletes a product, and a fetch failure for one item or one whole
 * service type never touches data that's already synced.
 */
export async function syncCatalog(): Promise<SyncSummary> {
  const supabase = createSupabaseServiceRoleClient();
  const errors: SyncError[] = [];
  const locationCache = new Map<number, number>();

  const { data: runRow, error: runInsertError } = await supabase
    .from("catalog_sync_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  if (runInsertError || !runRow) {
    throw new Error(`Could not start a sync run log entry: ${runInsertError?.message}`);
  }

  let productsSeen = 0;
  let productsUpserted = 0;
  let productsDeactivated = 0;
  const seenWpPostIds: number[] = [];

  for (const serviceType of SERVICE_TYPES) {
    let listItems;
    try {
      listItems = await fetchAllServiceListItems(serviceType);
    } catch (err) {
      errors.push({
        serviceType,
        message: `Could not list ${serviceType} from WordPress: ${(err as Error).message}`,
      });
      // Skip this type entirely for this run -- crucially, we do NOT mark
      // its existing products inactive below, since "we don't know if
      // this list changed" (own type of guard, see the WHERE below).
      continue;
    }

    for (const item of listItems) {
      productsSeen += 1;
      seenWpPostIds.push(item.ID);
      try {
        const detail = await fetchServiceDetail(serviceType, item.ID);
        if (!detail) {
          errors.push({
            serviceType,
            wpPostId: item.ID,
            message: "Listed but detail fetch returned Not Found (may have been removed mid-sync)",
          });
          continue;
        }

        const product = transformWpProduct(serviceType, item.ID, item.url, detail);

        const { data: upserted, error: upsertError } = await supabase
          .from("products")
          .upsert(
            {
              wp_post_id: product.wp_post_id,
              wp_type: product.wp_type,
              slug: product.slug,
              title: product.title,
              excerpt: product.excerpt,
              description_html: product.description_html,
              cover_image_url: product.cover_image_url,
              gallery_urls: product.gallery_urls,
              duration_label: product.duration_label,
              adult_price_usd: product.adult_price_usd,
              child_price_usd: product.child_price_usd,
              infant_price_usd: product.infant_price_usd,
              min_people: product.min_people,
              max_people: product.max_people,
              includes: product.includes,
              excludes: product.excludes,
              highlights: product.highlights,
              itinerary: product.itinerary,
              faq: product.faq,
              lat: product.lat,
              lng: product.lng,
              is_bookable: product.is_bookable,
              status: "active",
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "wp_post_id" }
          )
          .select("id")
          .single();

        if (upsertError || !upserted) {
          throw new Error(upsertError?.message ?? "Unknown upsert error");
        }
        productsUpserted += 1;

        // Replace this product's location links with the current set.
        await supabase.from("product_locations").delete().eq("product_id", upserted.id);
        if (product.location_wp_ids.length > 0) {
          const locationRowIds = await Promise.all(
            product.location_wp_ids.map((wpId) => ensureLocationRow(supabase, wpId, locationCache))
          );
          await supabase
            .from("product_locations")
            .insert(locationRowIds.map((locationId) => ({ product_id: upserted.id, location_id: locationId })));
        }
      } catch (err) {
        errors.push({
          serviceType,
          wpPostId: item.ID,
          message: (err as Error).message,
        });
      }
    }
  }

  // Anything previously active that we didn't see in a *successfully
  // fetched* service type this run has disappeared from WordPress --
  // deactivate it, but never delete (a real Phase 1+ booking could
  // reference it later).
  if (seenWpPostIds.length > 0) {
    const { data: deactivated, error: deactivateError } = await supabase
      .from("products")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("status", "active")
      .not("wp_post_id", "in", `(${seenWpPostIds.join(",")})`)
      .select("id");
    if (deactivateError) {
      errors.push({ serviceType: "*", message: `Deactivation step failed: ${deactivateError.message}` });
    } else {
      productsDeactivated = deactivated?.length ?? 0;
    }
  }

  const status: SyncSummary["status"] =
    errors.length === 0 ? "success" : productsUpserted > 0 ? "partial" : "failed";

  await supabase
    .from("catalog_sync_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      products_seen: productsSeen,
      products_upserted: productsUpserted,
      products_deactivated: productsDeactivated,
      errors,
    })
    .eq("id", runRow.id);

  return { status, productsSeen, productsUpserted, productsDeactivated, errors };
}
