import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DISCOUNT_TYPE_LABELS, type DiscountCode } from "@/lib/discounts/types";

function formatValue(code: DiscountCode): string {
  return code.discount_type === "percent" ? `${code.discount_value}%` : `$${code.discount_value}`;
}

export default async function AdminDiscountCodesPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data: codes, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Discount codes</h1>
        <Link
          href="/admin/discount-codes/new"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          + Add code
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          Couldn&apos;t load discount codes: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-sand-deep bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Uses</th>
              <th className="px-4 py-2">Expires</th>
              <th className="px-4 py-2">Active?</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {(codes as DiscountCode[] | null)?.map((code) => (
              <tr key={code.id} className="border-t border-sand-deep">
                <td className="px-4 py-2 font-mono font-medium text-ink">{code.code}</td>
                <td className="px-4 py-2">{DISCOUNT_TYPE_LABELS[code.discount_type]}</td>
                <td className="px-4 py-2">{formatValue(code)}</td>
                <td className="px-4 py-2">
                  {code.used_count}
                  {code.max_uses != null ? ` / ${code.max_uses}` : ""}
                </td>
                <td className="px-4 py-2">
                  {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : "Never"}
                </td>
                <td className="px-4 py-2">{code.active ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/discount-codes/${code.id}/edit`} className="text-teal underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {codes?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                  No discount codes yet — click &ldquo;Add code&rdquo; to create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
