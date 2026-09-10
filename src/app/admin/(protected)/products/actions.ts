"use server";

import { redirect } from "next/navigation";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/products/slugify";
import { decodeHtmlEntities } from "@/lib/products/decode-html-entities";
import { DEFAULT_MIN_LEAD_HOURS } from "@/lib/products/leadTime";
import type { ProductType } from "@/lib/products/types";
import { maybeRetranslateProduct } from "@/lib/i18n/translateProduct";
import { translateToIndonesian } from "@/lib/i18n/googleTranslate";

const PRODUCT_TYPES: ProductType[] = ["tour", "activity", "car_hire", "transport"];

function optionalText(formData: FormData, key: string): string | null {
  const value = decodeHtmlEntities(String(formData.get(key) ?? "")).trim();
  return value === "" ? null : value;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = String(formData.get(key) ?? "").trim();
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Highlights/includes/excludes/trip notes are all "one per line" in
 * the admin form -- simplest possible input for a non-technical admin,
 * no add/remove-row UI needed for what's genuinely just a bullet list. */
function linesToList(formData: FormData, key: string): string[] {
  return decodeHtmlEntities(String(formData.get(key) ?? ""))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Itinerary needs a title *and* a description per stop, so it can't
 * be one line per entry -- the form submits two same-named,
 * same-order field lists (same pattern as gallery_urls) and this zips
 * them back into pairs, dropping any row left with no title. */
function formToItinerary(formData: FormData): Array<{ title: string; description: string }> {
  const titles = formData.getAll("itinerary_title").map((v) => decodeHtmlEntities(String(v)).trim());
  const descriptions = formData
    .getAll("itinerary_description")
    .map((v) => decodeHtmlEntities(String(v)).trim());
  return titles
    .map((title, i) => ({ title, description: descriptions[i] ?? "" }))
    .filter((entry) => entry.title !== "");
}

type BuildProductRowResult =
  | { ok: true; row: ReturnType<typeof toProductRow> }
  | { ok: false; error: string };

function toProductRow(formData: FormData, productType: ProductType, title: string, slug: string) {
  const galleryUrls = formData.getAll("gallery_urls").map(String).filter(Boolean);
  const minLeadHoursRaw = Number(formData.get("min_lead_hours"));
  const minLeadHours =
    Number.isFinite(minLeadHoursRaw) && minLeadHoursRaw >= 0
      ? Math.round(minLeadHoursRaw)
      : DEFAULT_MIN_LEAD_HOURS;
  const durationDaysRaw = Number(formData.get("duration_days"));
  const durationDays =
    Number.isFinite(durationDaysRaw) && durationDaysRaw >= 1 ? Math.round(durationDaysRaw) : 1;
  return {
    product_type: productType,
    title,
    slug,
    excerpt: optionalText(formData, "excerpt"),
    description: optionalText(formData, "description"),
    location: optionalText(formData, "location"),
    category: optionalText(formData, "category"),
    duration_label: optionalText(formData, "duration_label"),
    duration_days: durationDays,
    adult_price_usd: optionalNumber(formData, "adult_price_usd"),
    child_price_usd: optionalNumber(formData, "child_price_usd"),
    infant_price_usd: optionalNumber(formData, "infant_price_usd"),
    capacity_per_date: optionalNumber(formData, "capacity_per_date"),
    min_lead_hours: minLeadHours,
    cover_image_url: galleryUrls[0] ?? null,
    gallery_urls: galleryUrls,
    highlights: linesToList(formData, "highlights"),
    includes: linesToList(formData, "includes"),
    excludes: linesToList(formData, "excludes"),
    trip_notes: linesToList(formData, "trip_notes"),
    itinerary: formToItinerary(formData),
    source_url: optionalText(formData, "source_url"),
    is_bookable: formData.get("is_bookable") === "on",
    status: (formData.get("status") === "inactive" ? "inactive" : "active") as "active" | "inactive",
  };
}

/** Shared by create and update -- returns either a validated row ready
 * to insert/update, or an error string to show the admin back on the
 * form (never both). */
function buildProductRow(formData: FormData): BuildProductRowResult {
  const productType = String(formData.get("product_type") ?? "");
  const title = decodeHtmlEntities(String(formData.get("title") ?? "")).trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const adultPrice = optionalNumber(formData, "adult_price_usd");

  if (!PRODUCT_TYPES.includes(productType as ProductType)) {
    return { ok: false, error: "Please choose a product type." };
  }
  if (!title) {
    return { ok: false, error: "Title is required." };
  }
  const needsSinglePrice = productType !== "car_hire" && productType !== "transport";
  if (needsSinglePrice && adultPrice === null) {
    return { ok: false, error: "Adult price is required and must be a number." };
  }

  const slug = slugify(slugInput || title);
  if (!slug) {
    return {
      ok: false,
      error: "Couldn't work out a URL slug from that title -- try adding one by hand.",
    };
  }

  return { ok: true, row: toProductRow(formData, productType as ProductType, title, slug) };
}

export async function createProductAction(formData: FormData) {
  await requireAdminSection("products");
  const result = buildProductRow(formData);
  if (!result.ok) {
    redirect(`/admin/products/new?error=${encodeURIComponent(result.error)}`);
  }

  // A brand-new product has no prior translation to compare against,
  // so this always generates a first Indonesian draft (still unshown
  // to customers until approved on the edit page).
  const translationFields = await maybeRetranslateProduct(
    { title: result.row.title, excerpt: result.row.excerpt, description: result.row.description },
    null
  );

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").insert({ ...result.row, ...translationFields });
  if (error) {
    redirect(`/admin/products/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/products");
}

export async function updateProductAction(productId: string, formData: FormData) {
  await requireAdminSection("products");
  const result = buildProductRow(formData);
  if (!result.ok) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();

  // Only regenerates the Indonesian draft if the English content
  // actually changed since the last translation -- see
  // maybeRetranslateProduct for the comparison.
  const { data: existing } = await supabase
    .from("products")
    .select("translated_from_title, translated_from_excerpt, translated_from_description")
    .eq("id", productId)
    .maybeSingle();
  const translationFields = await maybeRetranslateProduct(
    { title: result.row.title, excerpt: result.row.excerpt, description: result.row.description },
    existing
  );

  const { error } = await supabase
    .from("products")
    .update({ ...result.row, ...translationFields, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/products");
}

/** Publishes an admin's (possibly hand-edited) Indonesian text --
 * nothing reaches the /id product page until this runs, regardless of
 * how many machine-translated drafts have been generated in the
 * meantime. */
export async function approveProductTranslationAction(productId: string, formData: FormData) {
  await requireAdminSection("products");
  const titleId = optionalText(formData, "title_id");
  const excerptId = optionalText(formData, "excerpt_id");
  const descriptionId = optionalText(formData, "description_id");

  if (!titleId) {
    redirect(
      `/admin/products/${productId}/edit?error=${encodeURIComponent("The Indonesian title can't be empty.")}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      title_id: titleId,
      excerpt_id: excerptId,
      description_id: descriptionId,
      translation_status: "approved",
    })
    .eq("id", productId);

  if (error) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/products/${productId}/edit?translation_saved=1`);
}

/** Re-runs machine translation from the product's current English
 * content, ignoring whatever draft is already there -- for when the
 * first attempt read oddly, or a previous attempt failed outright
 * (missing/invalid API key, Google Translate briefly down). Still
 * lands as a "draft" -- this never publishes anything by itself. */
export async function retranslateProductAction(productId: string) {
  await requireAdminSection("products");

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("title, excerpt, description")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent("Product not found.")}`);
  }

  try {
    const [titleId, excerptId, descriptionId] = await translateToIndonesian([
      product.title,
      product.excerpt ?? "",
      product.description ?? "",
    ]);
    const { error } = await supabase
      .from("products")
      .update({
        title_id: titleId || null,
        excerpt_id: excerptId || null,
        description_id: descriptionId || null,
        translation_status: "draft",
        translated_from_title: product.title,
        translated_from_excerpt: product.excerpt,
        translated_from_description: product.description,
      })
      .eq("id", productId);
    if (error) {
      redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(error.message)}`);
    }
  } catch (err) {
    redirect(
      `/admin/products/${productId}/edit?error=${encodeURIComponent(`Translation failed: ${(err as Error).message}`)}`
    );
  }

  redirect(`/admin/products/${productId}/edit?retranslated=1`);
}
