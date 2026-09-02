import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveTransportPricesAction } from "./actions";
import type { MeetingPoint, TransportPrice, TransportVehicleType } from "@/lib/cars/types";
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

  const { data: vehicleTypesData } = await supabase
    .from("transport_vehicle_types")
    .select("*")
    .eq("product_id", productId)
    .order("name", { ascending: true });
  const vehicleTypes = (vehicleTypesData ?? []) as TransportVehicleType[];
  const vehicleTypeIds = vehicleTypes.map((v) => v.id);

  const { data: pricesData } =
    vehicleTypeIds.length > 0
      ? await supabase.from("transport_prices").select("*").in("vehicle_type_id", vehicleTypeIds)
      : { data: [] as TransportPrice[] };
  const prices = (pricesData ?? []) as TransportPrice[];
  const priceByKey = new Map(prices.map((p) => [`${p.vehicle_type_id}__${p.meeting_point_id}`, p.price_idr]));

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
        Price is set per vehicle/service type and pickup area -- e.g. Sedan vs. Van, or Shared vs.
        Private Speedboat for a Gili Islands transfer.
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

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">Vehicle / service types</h2>
        <Link
          href={`/admin/products/${productId}/transport-pricing/vehicle-types/new`}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Add vehicle/service type
        </Link>
      </div>

      {vehicleTypes.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          No vehicle/service types yet — add one (e.g. &quot;Sedan, up to 4 passengers&quot;) to get
          started. If you only offer one option, a single type still works fine.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-sand-deep bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-sand text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Capacity note</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {vehicleTypes.map((v) => (
                <tr key={v.id} className="border-t border-sand-deep">
                  <td className="px-4 py-2 font-medium text-ink">{v.name}</td>
                  <td className="px-4 py-2 text-ink-soft">{v.capacity_note ?? "—"}</td>
                  <td className="px-4 py-2 text-ink-soft">{v.status}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/products/${productId}/transport-pricing/vehicle-types/${v.id}/edit`}
                      className="text-teal underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">Price grid</h2>
      <p className="mt-1 text-sm text-ink-soft">
        One row per vehicle/service type, one column per pickup area. Leave a cell blank if that
        combination isn&apos;t offered.
      </p>

      {meetingPoints.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Add at least one{" "}
          <Link href="/admin/meeting-points" className="text-teal underline">
            meeting point
          </Link>{" "}
          before setting prices.
        </p>
      ) : vehicleTypes.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Add a vehicle/service type above before setting prices.
        </p>
      ) : (
        <form action={saveTransportPricesAction.bind(null, productId)} className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-sand text-xs uppercase text-ink-soft">
              <tr>
                <th className="border border-sand-deep px-3 py-2">Vehicle / service</th>
                {meetingPoints.map((mp) => (
                  <th key={mp.id} className="border border-sand-deep px-3 py-2">
                    {mp.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicleTypes.map((v) => (
                <tr key={v.id}>
                  <td className="border border-sand-deep px-3 py-2 font-medium text-ink">
                    {v.name}
                    {v.capacity_note && <span className="block text-xs text-ink-soft">{v.capacity_note}</span>}
                  </td>
                  {meetingPoints.map((mp) => (
                    <td key={mp.id} className="border border-sand-deep px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        name={`price__${v.id}__${mp.id}`}
                        defaultValue={priceByKey.get(`${v.id}__${mp.id}`) ?? ""}
                        placeholder="—"
                        className="w-28 rounded border border-sand-deep px-2 py-1 text-sm outline-none focus:border-teal"
                      />
                    </td>
                  ))}
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
