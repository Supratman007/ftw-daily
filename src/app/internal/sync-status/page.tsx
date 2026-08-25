import { redirect } from "next/navigation";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { syncCatalog } from "@/lib/sync/syncCatalog";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";

/**
 * Internal, developer-only page for eyeballing what the WordPress sync
 * actually pulled in, compared to what's now in our database -- exactly
 * the kind of check the spec calls for before anything customer-facing
 * depends on this. Not linked from anywhere in the site's navigation.
 *
 * Phase 1 has no admin login system yet, so this is gated with the same
 * shared secret as the cron job itself (?key=...) rather than left wide
 * open. Revisit once real admin auth exists.
 */

async function runSyncAction(formData: FormData) {
  "use server";
  const key = String(formData.get("key") ?? "");
  await syncCatalog();
  redirect(`/internal/sync-status?key=${encodeURIComponent(key)}`);
}

export default async function SyncStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const expectedKey = process.env.CRON_SECRET;

  if (!expectedKey || key !== expectedKey) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-serif text-xl text-ocean">Not authorized</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Add <code>?key=YOUR_CRON_SECRET</code> to the address (the same value
          as the <code>CRON_SECRET</code> environment variable) to view this page.
        </p>
      </main>
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: runs } = await supabase
    .from("catalog_sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold text-ocean">
        WordPress catalog sync — internal status
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Not a customer-facing page. Compare this against{" "}
        <a
          className="underline"
          href="https://adventure-lombok.com"
          target="_blank"
          rel="noreferrer"
        >
          adventure-lombok.com
        </a>{" "}
        to check the sync is pulling the right things.
      </p>

      <form action={runSyncAction} className="mt-6">
        <input type="hidden" name="key" value={key} />
        <button
          type="submit"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          Run sync now
        </button>
      </form>

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">Recent sync runs</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-sand-deep">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Seen</th>
              <th className="px-3 py-2">Upserted</th>
              <th className="px-3 py-2">Deactivated</th>
              <th className="px-3 py-2">Errors</th>
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).map((run) => (
              <tr key={run.id} className="border-t border-sand-deep">
                <td className="px-3 py-2">{new Date(run.started_at).toLocaleString()}</td>
                <td className="px-3 py-2">{run.status}</td>
                <td className="px-3 py-2">{run.products_seen}</td>
                <td className="px-3 py-2">{run.products_upserted}</td>
                <td className="px-3 py-2">{run.products_deactivated}</td>
                <td className="px-3 py-2">
                  {Array.isArray(run.errors) && run.errors.length > 0 ? (
                    <details>
                      <summary className="cursor-pointer text-coral-dark">
                        {run.errors.length} error(s)
                      </summary>
                      <pre className="mt-1 max-w-xs whitespace-pre-wrap text-xs text-ink-soft">
                        {JSON.stringify(run.errors, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {(!runs || runs.length === 0) && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                  No sync runs yet — click &ldquo;Run sync now&rdquo; above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">
        Products currently in our database ({products?.length ?? 0})
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-sand-deep">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-sand text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Bookable?</th>
              <th className="px-3 py-2">Adult price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last synced</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id} className="border-t border-sand-deep">
                <td className="px-3 py-2">
                  <a
                    className="underline"
                    href={`https://adventure-lombok.com/${product.wp_type === "tour" ? "st_tour" : "st_activity"}/${product.slug}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {product.title}
                  </a>
                </td>
                <td className="px-3 py-2">{product.wp_type}</td>
                <td className="px-3 py-2">{product.is_bookable ? "Yes" : "No (excluded)"}</td>
                <td className="px-3 py-2">
                  {product.adult_price_usd != null
                    ? `${formatUsd(product.adult_price_usd)} (${formatIdr(usdToIdr(product.adult_price_usd))})`
                    : "—"}
                </td>
                <td className="px-3 py-2">{product.status}</td>
                <td className="px-3 py-2">
                  {product.last_synced_at ? new Date(product.last_synced_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                  No products synced yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
