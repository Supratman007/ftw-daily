"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CAR_DURATION_OPTIONS } from "@/lib/cars/types";

function toCarTypeRow(formData: FormData, productId: string) {
  const capacityTier = Number(formData.get("capacity_tier")) === 6 ? 6 : 4;
  const featuresRaw = String(formData.get("features") ?? "");
  return {
    product_id: productId,
    name: String(formData.get("name") ?? "").trim(),
    capacity_tier: capacityTier,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    features: featuresRaw
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean),
    status: formData.get("status") === "inactive" ? "inactive" : "active",
  };
}

export async function createCarTypeAction(productId: string, formData: FormData) {
  await requireAdmin();
  const row = toCarTypeRow(formData, productId);
  if (!row.name) {
    redirect(
      `/admin/products/${productId}/car-pricing/car-types/new?error=${encodeURIComponent(
        "Name is required."
      )}`
    );
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("car_types").update(row).eq("id", carTypeId);
  if (error) {
    redirect(`${editPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/products/${productId}/car-pricing`);
}

function toCarPackageRow(formData: FormData, carTypeId: string) {
  const duration = Number(formData.get("duration_hours"));
  const durationHours = (CAR_DURATION_OPTIONS as readonly number[]).includes(duration)
    ? duration
    : CAR_DURATION_OPTIONS[0];
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
