import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveCarPricesAction } from "./actions";
import type { CarType, CarPackage, CarPackagePrice, MeetingPoint } from "@/lib/cars/types";
import type { Product } from "@/lib/products/types";

export default async function CarPricingPage({
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

  if (!product || (product as Product).product_type !== "car_hire") {
    notFound();
  }

  const { data: carTypesData } = await supabase
    .from("car_types")
    .select("*")
    .eq("product_id", productId)
    .order("name", { ascending: true });
  const carTypes = (carTypesData ?? []) as CarType[];
  const carTypeIds = carTypes.map((c) => c.id);

  const { data: packagesData } =
    carTypeIds.length > 0
      ? await supabase
          .from("car_packages")
          .select("*")
          .in("car_type_id", carTypeIds)
          .order("duration_hours", { ascending: true })
      : { data: [] as CarPackage[] };
  const packages = (packagesData ?? []) as CarPackage[];
  const packageIds = packages.map((p) => p.id);

  const { data: pricesData } =
    packageIds.length > 0
      ? await supabase.from("car_package_prices").select("*").in("car_package_id", packageIds)
      : { data: [] as CarPackagePrice[] };
  const prices = (pricesData ?? []) as CarPackagePrice[];
  const priceByKey = new Map(prices.map((p) => [`${p.car_package_id}__${p.meeting_point_id}`, p.price_idr]));

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
        Car types &amp; pricing — {(product as Product).title}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Price is set by car type, how many hours it&apos;s booked for, and the customer&apos;s
        pickup area — never a single price like other listings.
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
        <h2 className="font-serif text-lg font-semibold text-ink">Car types</h2>
        <Link
          href={`/admin/products/${productId}/car-pricing/car-types/new`}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Add car type
        </Link>
      </div>

      {carTypes.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          No car types yet — add one (e.g. &quot;Toyota Avanza, 6 seats&quot;) to get started.
        </p>
      )}

      {carTypes.map((carType) => {
        const carPackages = packages.filter((p) => p.car_type_id === carType.id);
        return (
          <div key={carType.id} className="mt-4 overflow-hidden rounded-lg border border-sand-deep bg-white">
            <div className="flex items-center justify-between border-b border-sand-deep bg-sand px-4 py-3">
              <div>
                <p className="font-semibold text-ink">
                  {carType.name} <span className="text-ink-soft">— {carType.capacity_tier} seats</span>
                </p>
                <p className="text-xs text-ink-soft">
                  {carType.status === "active" ? "Active" : "Inactive"}
                  {carType.features.length > 0 ? ` · ${carType.features.join(", ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href={`/admin/products/${productId}/car-pricing/car-types/${carType.id}/packages/new`}
                  className="text-teal underline"
                >
                  + Add duration
                </Link>
                <Link
                  href={`/admin/products/${productId}/car-pricing/car-types/${carType.id}/edit`}
                  className="text-teal underline"
                >
                  Edit
                </Link>
              </div>
            </div>
            <div className="p-4">
              {carPackages.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  No durations yet — add 6/8/10-hour packages for this car.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-3 text-sm">
                  {carPackages.map((pkg) => (
                    <li key={pkg.id} className="rounded-lg border border-sand-deep px-3 py-1.5">
                      {pkg.duration_hours}h · overtime Rp{pkg.overtime_rate_per_hour_idr.toLocaleString("id-ID")}/h
                      {pkg.status === "inactive" && <span className="text-ink-soft"> (inactive)</span>}{" "}
                      <Link
                        href={`/admin/products/${productId}/car-pricing/car-types/${carType.id}/packages/${pkg.id}/edit`}
                        className="text-teal underline"
                      >
                        Edit
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">Price grid</h2>
      <p className="mt-1 text-sm text-ink-soft">
        One row per car &amp; duration, one column per pickup area. Leave a cell blank if that
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
      ) : packages.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Add a car type and at least one duration package above before setting prices.
        </p>
      ) : (
        <form action={saveCarPricesAction.bind(null, productId)} className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-sand text-xs uppercase text-ink-soft">
              <tr>
                <th className="border border-sand-deep px-3 py-2">Car / duration</th>
                {meetingPoints.map((mp) => (
                  <th key={mp.id} className="border border-sand-deep px-3 py-2">
                    {mp.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const carType = carTypes.find((c) => c.id === pkg.car_type_id);
                return (
                  <tr key={pkg.id}>
                    <td className="border border-sand-deep px-3 py-2 font-medium text-ink">
                      {carType?.name ?? "—"} · {pkg.duration_hours}h
                    </td>
                    {meetingPoints.map((mp) => (
                      <td key={mp.id} className="border border-sand-deep px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          name={`price__${pkg.id}__${mp.id}`}
                          defaultValue={priceByKey.get(`${pkg.id}__${mp.id}`) ?? ""}
                          placeholder="—"
                          className="w-28 rounded border border-sand-deep px-2 py-1 text-sm outline-none focus:border-teal"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
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
