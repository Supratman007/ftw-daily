"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/products/slugify";
import { decodeHtmlEntities } from "@/lib/products/decode-html-entities";
import type { ProductType } from "@/lib/products/types";

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

type BuildProductRowResult =
  | { ok: true; row: ReturnType<typeof toProductRow> }
  | { ok: false; error: string };

function toProductRow(formData: FormData, productType: ProductType, title: string, slug: string) {
  const galleryUrls = formData.getAll("gallery_urls").map(String).filter(Boolean);
  return {
    product_type: productType,
    title,
    slug,
    excerpt: optionalText(formData, "excerpt"),
    description: optionalText(formData, "description"),
    location: optionalText(formData, "location"),
    category: optionalText(formData, "category"),
    duration_label: optionalText(formData, "duration_label"),
    adult_price_usd: optionalNumber(formData, "adult_price_usd"),
    child_price_usd: optionalNumber(formData, "child_price_usd"),
    infant_price_usd: optionalNumber(formData, "infant_price_usd"),
    capacity_per_date: optionalNumber(formData, "capacity_per_date"),
    cover_image_url: galleryUrls[0] ?? null,
    gallery_urls: galleryUrls,
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
  await requireAdmin();
  const result = buildProductRow(formData);
  if (!result.ok) {
    redirect(`/admin/products/new?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").insert(result.row);
  if (error) {
    redirect(`/admin/products/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/products");
}

export async function updateProductAction(productId: string, formData: FormData) {
  await requireAdmin();
  const result = buildProductRow(formData);
  if (!result.ok) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ ...result.row, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/products");
}
