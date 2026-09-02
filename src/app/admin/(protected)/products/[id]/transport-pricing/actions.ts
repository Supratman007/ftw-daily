"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toVehicleTypeRow(formData: FormData, productId: string) {
  return {
    product_id: productId,
    name: String(formData.get("name") ?? "").trim(),
    capacity_note: String(formData.get("capacity_note") ?? "").trim() || null,
    status: formData.get("status") === "inactive" ? "inactive" : "active",
  };
}

export async function createTransportVehicleTypeAction(productId: string, formData: FormData) {
  await requireAdmin();
  const row = toVehicleTypeRow(formData, productId);
  const newPath = `/admin/products/${productId}/transport-pricing/vehicle-types/new`;
  if (!row.name) {
    redirect(`${newPath}?error=${encodeURIComponent("Name is required.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("transport_vehicle_types").insert(row);
  if (error) {
    redirect(`${newPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/products/${productId}/transport-pricing`);
}

export async function updateTransportVehicleTypeAction(
  productId: string,
  vehicleTypeId: string,
  formData: FormData
) {
  await requireAdmin();
  const row = toVehicleTypeRow(formData, productId);
  const editPath = `/admin/products/${productId}/transport-pricing/vehicle-types/${vehicleTypeId}/edit`;
  if (!row.name) {
    redirect(`${editPath}?error=${encodeURIComponent("Name is required.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("transport_vehicle_types").update(row).eq("id", vehicleTypeId);
  if (error) {
    redirect(`${editPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/products/${productId}/transport-pricing`);
}

/** Same spreadsheet-style bulk save as Car Hire's price grid -- one
 * field per (vehicle_type_id, from_meeting_point_id,
 * to_meeting_point_id) cell, named
 * "price__<vehicleTypeId>__<fromId>__<toId>". An emptied cell deletes
 * that route (meaning "we don't run this route on this vehicle"). */
export async function saveTransportPricesAction(productId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const upserts: {
    vehicle_type_id: string;
    from_meeting_point_id: string;
    to_meeting_point_id: string;
    price_idr: number;
  }[] = [];
  const deletes: { vehicle_type_id: string; from_meeting_point_id: string; to_meeting_point_id: string }[] =
    [];

  for (const [key, rawValue] of formData.entries()) {
    const match = key.match(/^price__(.+)__(.+)__(.+)$/);
    if (!match) continue;
    const [, vehicleTypeId, fromId, toId] = match;
    const value = String(rawValue).trim();
    if (value === "") {
      deletes.push({ vehicle_type_id: vehicleTypeId, from_meeting_point_id: fromId, to_meeting_point_id: toId });
      continue;
    }
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) continue;
    upserts.push({
      vehicle_type_id: vehicleTypeId,
      from_meeting_point_id: fromId,
      to_meeting_point_id: toId,
      price_idr: price,
    });
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("transport_prices")
      .upsert(upserts, { onConflict: "vehicle_type_id,from_meeting_point_id,to_meeting_point_id" });
    if (error) {
      redirect(
        `/admin/products/${productId}/transport-pricing?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  for (const d of deletes) {
    await supabase
      .from("transport_prices")
      .delete()
      .eq("vehicle_type_id", d.vehicle_type_id)
      .eq("from_meeting_point_id", d.from_meeting_point_id)
      .eq("to_meeting_point_id", d.to_meeting_point_id);
  }

  redirect(`/admin/products/${productId}/transport-pricing?saved=1`);
}
