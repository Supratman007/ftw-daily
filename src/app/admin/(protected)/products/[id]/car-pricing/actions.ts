"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toCarTypeRow(formData: FormData, productId: string) {
  const capacityRaw = Number(formData.get("capacity_tier"));
  const capacityTier = Number.isFinite(capacityRaw) && capacityRaw > 0 ? Math.round(capacityRaw) : 0;
  const featuresRaw = String(formData.get("features") ?? "");
  const galleryUrls = formData.getAll("gallery_urls").map(String).filter(Boolean);
  return {
    product_id: productId,
    name: String(formData.get("name") ?? "").trim(),
    capacity_tier: capacityTier,
    // The first uploaded photo doubles as the thumbnail shown on the
    // picker card -- gallery_urls holds the full set shown once this
    // car is selected.
    image_url: galleryUrls[0] ?? null,
    gallery_urls: galleryUrls,
    features: featuresRaw
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean),
    recommended_for: String(formData.get("recommended_for") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    status: formData.get("status") === "inactive" ? "inactive" : "active",
  };
}

export async function createCarTypeAction(productId: string, formData: FormData) {
  await requireAdmin();
  const row = toCarTypeRow(formData, productId);
  const newPath = `/admin/products/${productId}/car-pricing/car-types/new`;
  if (!row.name) {
    redirect(`${newPath}?error=${encodeURIComponent("Name is required.")}`);
  }
  if (row.capacity_tier < 1) {
    redirect(`${newPath}?error=${encodeURIComponent("Seats must be a number greater than 0.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("car_types").insert(row);
  if (error) {
    redirect(
      `/admin/products/${productId}/car-pricing/car-types/new?error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(`/admin/products/${productId}/car-pricing`);
}

export async function updateCarTypeAction(
  productId: string,
  carTypeId: string,
  formData: FormData
) {
  await requireAdmin();
  const row = toCarTypeRow(formData, productId);
  const editPath = `/admin/products/${productId}/car-pricing/car-types/${carTypeId}/edit`;
  if (!row.name) {
    redirect(`${editPath}?error=${encodeURIComponent("Name is required.")}`);
  }
  if (row.capacity_tier < 1) {
    redirect(`${editPath}?error=${encodeURIComponent("Seats must be a number greater than 0.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("car_types").update(row).eq("id", carTypeId);
  if (error) {
    redirect(`${editPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/products/${productId}/car-pricing`);
}

function toCarPackageRow(formData: FormData, carTypeId: string) {
  const durationRaw = Number(formData.get("duration_hours"));
  const durationHours = Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : 0;
  const overtimeRate = Number(formData.get("overtime_rate_per_hour_idr"));
  return {
    car_type_id: carTypeId,
    duration_hours: durationHours,
    overtime_rate_per_hour_idr: Number.isFinite(overtimeRate) ? overtimeRate : 0,
    status: formData.get("status") === "inactive" ? "inactive" : "active",
  };
}

export async function createCarPackageAction(
  productId: string,
  carTypeId: string,
  formData: FormData
) {
  await requireAdmin();
  const row = toCarPackageRow(formData, carTypeId);
  const newPath = `/admin/products/${productId}/car-pricing/car-types/${carTypeId}/packages/new`;
  if (row.duration_hours < 1) {
    redirect(`${newPath}?error=${encodeURIComponent("Duration must be a number greater than 0.")}`);
  }
  if (row.overtime_rate_per_hour_idr < 0) {
    redirect(`${newPath}?error=${encodeURIComponent("Overtime rate must be zero or more.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("car_packages").insert(row);
  if (error) {
    redirect(`${newPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/products/${productId}/car-pricing`);
}

export async function updateCarPackageAction(
  productId: string,
  carTypeId: string,
  packageId: string,
  formData: FormData
) {
  await requireAdmin();
  const row = toCarPackageRow(formData, carTypeId);
  const editPath = `/admin/products/${productId}/car-pricing/car-types/${carTypeId}/packages/${packageId}/edit`;
  if (row.duration_hours < 1) {
    redirect(`${editPath}?error=${encodeURIComponent("Duration must be a number greater than 0.")}`);
  }
  if (row.overtime_rate_per_hour_idr < 0) {
    redirect(`${editPath}?error=${encodeURIComponent("Overtime rate must be zero or more.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("car_packages").update(row).eq("id", packageId);
  if (error) {
    redirect(`${editPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/products/${productId}/car-pricing`);
}

/** The price grid submits one field per (car_package_id, meeting_point_id)
 * cell, named "price__<carPackageId>__<meetingPointId>" -- spec calls for
 * a spreadsheet-like editor rather than a form per combination, so this
 * one action saves the whole grid in a single submit. An emptied cell
 * deletes that price (meaning "not offered at this location"). */
export async function saveCarPricesAction(productId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const upserts: { car_package_id: string; meeting_point_id: string; price_idr: number }[] = [];
  const deletes: { car_package_id: string; meeting_point_id: string }[] = [];

  for (const [key, rawValue] of formData.entries()) {
    const match = key.match(/^price__(.+)__(.+)$/);
    if (!match) continue;
    const [, carPackageId, meetingPointId] = match;
    const value = String(rawValue).trim();
    if (value === "") {
      deletes.push({ car_package_id: carPackageId, meeting_point_id: meetingPointId });
      continue;
    }
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) continue;
    upserts.push({ car_package_id: carPackageId, meeting_point_id: meetingPointId, price_idr: price });
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("car_package_prices")
      .upsert(upserts, { onConflict: "car_package_id,meeting_point_id" });
    if (error) {
      redirect(
        `/admin/products/${productId}/car-pricing?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  for (const d of deletes) {
    await supabase
      .from("car_package_prices")
      .delete()
      .eq("car_package_id", d.car_package_id)
      .eq("meeting_point_id", d.meeting_point_id);
  }

  redirect(`/admin/products/${productId}/car-pricing?saved=1`);
}
