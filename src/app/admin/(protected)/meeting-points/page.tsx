import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MeetingPoint } from "@/lib/cars/types";

/**
 * Admin-managed pickup location list (spec §6e) -- the shared pricing
 * key for both Car Hire (§6a) and Transport, and the fixed-list half
 * of the meeting-point picker (the other half is a free-text "Other").
 */
export default async function AdminMeetingPointsPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_points")
    .select("*")
    .order("name", { ascending: true });

  const meetingPoints = (data ?? []) as MeetingPoint[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Meeting points</h1>
        <Link
          href="/admin/meeting-points/new"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Add meeting point
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        The pickup locations customers choose from for Car Hire and Transport -- also what sets
        the price for each (§6a/§6e).
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Couldn&apos;t load meeting points: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-sand-deep bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Region</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {meetingPoints.map((m) => (
              <tr key={m.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 font-medium text-ink">{m.name}</td>
                <td className="px-4 py-2 text-ink-soft">{m.region ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{m.status}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/meeting-points/${m.id}/edit`} className="text-teal underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {meetingPoints.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                  No meeting points yet — add Senggigi first, since it&apos;s the default shown
                  before a customer picks anything.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
