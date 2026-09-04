import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MeetingPointForm } from "@/components/admin/MeetingPointForm";
import { updateMeetingPointAction } from "../../actions";
import type { MeetingPoint } from "@/lib/cars/types";

export default async function EditMeetingPointPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: meetingPoint } = await supabase
    .from("meeting_points")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!meetingPoint) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Edit meeting point</h1>
      <MeetingPointForm
        action={updateMeetingPointAction.bind(null, id)}
        meetingPoint={meetingPoint as MeetingPoint}
        error={error}
      />
    </div>
  );
}
