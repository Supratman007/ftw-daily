"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toMeetingPointRow(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    region: String(formData.get("region") ?? "").trim() || null,
    status: formData.get("status") === "inactive" ? "inactive" : "active",
  };
}

export async function createMeetingPointAction(formData: FormData) {
  await requireAdmin();
  const row = toMeetingPointRow(formData);
  if (!row.name) {
    redirect(`/admin/meeting-points/new?error=${encodeURIComponent("Name is required.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("meeting_points").insert(row);
  if (error) {
    redirect(`/admin/meeting-points/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/meeting-points");
}

export async function updateMeetingPointAction(meetingPointId: string, formData: FormData) {
  await requireAdmin();
  const row = toMeetingPointRow(formData);
  if (!row.name) {
    redirect(
      `/admin/meeting-points/${meetingPointId}/edit?error=${encodeURIComponent("Name is required.")}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("meeting_points").update(row).eq("id", meetingPointId);
  if (error) {
    redirect(`/admin/meeting-points/${meetingPointId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/meeting-points");
}
