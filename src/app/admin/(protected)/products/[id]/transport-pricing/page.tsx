import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveTransportPricesAction } from "./actions";
import type { MeetingPoint, TransportPrice } from "@/lib/cars/types";
import type { Product } from "@/lib/products/types";

export default async function TransportPricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id: productId } = await params;
  const { error, saved } = await searchParams;

  const supabase = await createSupabaseServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product || (product as Product).product_type !== "transport") {
    notFound();
  }

  const { data: pricesData } = await supabase
    .from("transport_prices")
    .select("*")
    .eq("product_id", productId);
  const prices = (pricesData ?? []) as TransportPrice[];
  const priceByMeetingPoint = new Map(prices.map((p) => [p.meeting_point_id, p.price_idr]));

  const { data: meetingPointsData } = await supabase
    .from("meeting_points")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true });
  const meetingPoints = (meetingPointsData ?? []) as MeetingPoint[];

  return (
    <div>
      <Link href={`/admin/products/${productId}/edit`} className="text-sm text-teal underline">
        ← Back to {(product as Product).title}
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">
        Transport pricing — {(product as Product).title}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Price is set per pickup area only — leave a row blank if this transport isn&apos;t offered
        from there.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E1F0EC] p-3 text-sm text-teal-dark">
          Prices saved.
        </p>
      )}

      {meetingPoints.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Add at least one{" "}
          <Link href="/admin/meeting-points" className="text-teal underline">
            meeting point
          </Link>{" "}
          before setting prices.
        </p>
      ) : (
        <form action={saveTransportPricesAction.bind(null, productId)} className="mt-6 max-w-md">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-sand text-xs uppercase text-ink-soft">
              <tr>
                <th className="border border-sand-deep px-3 py-2">Pickup area</th>
                <th className="border border-sand-deep px-3 py-2">Price (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {meetingPoints.map((mp) => (
                <tr key={mp.id}>
                  <td className="border border-sand-deep px-3 py-2 font-medium text-ink">{mp.name}</td>
                  <td className="border border-sand-deep px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      name={`price__${mp.id}`}
                      defaultValue={priceByMeetingPoint.get(mp.id) ?? ""}
                      placeholder="—"
                      className="w-32 rounded border border-sand-deep px-2 py-1 text-sm outline-none focus:border-teal"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            Save all prices
          </button>
        </form>
      )}
    </div>
  );
}
