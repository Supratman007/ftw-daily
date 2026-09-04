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
  const priceByKey = new Map(
    prices.map((p) => [`${p.vehicle_type_id}__${p.from_meeting_point_id}__${p.to_meeting_point_id}`, p.price_idr])
  );

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
        Price is set per vehicle/service type and per route (from one area to another) -- e.g.
        Airport ↔ Senggigi, Senggigi ↔ Tete Batu, on a Sedan vs. a Van. There&apos;s no need for a
        separate product per destination -- add every route this product runs here.
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

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">Route prices</h2>
      <p className="mt-1 text-sm text-ink-soft">
        One grid per vehicle/service type -- rows are where the trip starts, columns are where it
        ends. Leave a cell blank if you don&apos;t run that route. Most operators only fill in a
        handful of real routes, not the whole grid.
      </p>

      {meetingPoints.length < 2 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Add at least two{" "}
          <Link href="/admin/meeting-points" className="text-teal underline">
            meeting points
          </Link>{" "}
          before setting routes.
        </p>
      ) : vehicleTypes.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Add a vehicle/service type above before setting routes.
        </p>
      ) : (
        <form action={saveTransportPricesAction.bind(null, productId)} className="mt-4 flex flex-col gap-8">
          {vehicleTypes.map((v) => (
            <div key={v.id}>
              <p className="mb-2 font-semibold text-ink">
                {v.name}
                {v.capacity_note && <span className="font-normal text-ink-soft"> — {v.capacity_note}</span>}
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-sand text-xs uppercase text-ink-soft">
                    <tr>
                      <th className="border border-sand-deep px-3 py-2">From \ To</th>
                      {meetingPoints.map((to) => (
                        <th key={to.id} className="border border-sand-deep px-3 py-2">
                          {to.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meetingPoints.map((from) => (
                      <tr key={from.id}>
                        <td className="border border-sand-deep px-3 py-2 font-medium text-ink">{from.name}</td>
                        {meetingPoints.map((to) =>
                          from.id === to.id ? (
                            <td key={to.id} className="border border-sand-deep bg-sand px-2 py-1" />
                          ) : (
                            <td key={to.id} className="border border-sand-deep px-2 py-1">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                name={`price__${v.id}__${from.id}__${to.id}`}
                                defaultValue={priceByKey.get(`${v.id}__${from.id}__${to.id}`) ?? ""}
                                placeholder="—"
                                className="w-28 rounded border border-sand-deep px-2 py-1 text-sm outline-none focus:border-teal"
                              />
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <button
            type="submit"
            className="self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            Save all prices
          </button>
        </form>
      )}
    </div>
  );
}
