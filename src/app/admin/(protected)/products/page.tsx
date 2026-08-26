import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import { PRODUCT_TYPE_LABELS, type Product } from "@/lib/products/types";

export default async function AdminProductsPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Add product
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Couldn&apos;t load products: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Price (adult)</th>
              <th className="px-4 py-2">Bookable?</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {(products as Product[] | null)?.map((product) => (
              <tr key={product.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 font-medium text-ink">{product.title}</td>
                <td className="px-4 py-2">{PRODUCT_TYPE_LABELS[product.product_type]}</td>
                <td className="px-4 py-2">
                  {product.adult_price_usd != null
                    ? `${formatUsd(product.adult_price_usd)} (${formatIdr(usdToIdr(product.adult_price_usd))})`
                    : "—"}
                </td>
                <td className="px-4 py-2">{product.is_bookable ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{product.status}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/products/${product.id}/edit`} className="text-teal underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {products?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  No products yet — click &ldquo;Add product&rdquo; to create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
