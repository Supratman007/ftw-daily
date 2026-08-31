import { requireAdmin } from "@/lib/admin/auth";
import { MeetingPointForm } from "@/components/admin/MeetingPointForm";
import { createMeetingPointAction } from "../actions";

export default async function NewMeetingPointPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Add meeting point</h1>
      <MeetingPointForm action={createMeetingPointAction} error={error} />
    </div>
  );
}
