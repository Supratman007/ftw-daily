import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_USD_TO_IDR_RATE, formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import { updateExchangeRateAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1";

/**
 * The only setting so far (migration 0046_app_settings.sql) -- the
 * USD->IDR rate every priced page and checkout on the site reads from
 * getUsdToIdrRate(). Previously a hardcoded constant in
 * src/lib/currency.ts that only a developer could change; this is the
 * self-service replacement, Super Admin only (see
 * ADMIN_SECTION_ROLES.settings).
 */
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdminSection("settings");
  const { error, saved } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("usd_to_idr_rate, updated_at, updated_by, admin_users(name)")
    .eq("id", true)
    .maybeSingle();

  const currentRate = settings?.usd_to_idr_rate ?? DEFAULT_USD_TO_IDR_RATE;
  const updatedByName = (settings as { admin_users?: { name?: string } | null } | null)?.admin_users?.name;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The exchange rate used to show and charge IDR prices for every USD-priced trip on the
        site.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-teal bg-[#E3F2F1] p-3 text-sm text-teal">
          Exchange rate saved. It takes effect immediately on every page and new checkout.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
          {error}
        </p>
      )}

      <form action={updateExchangeRateAction} className="mt-6 flex max-w-sm flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="usd_to_idr_rate">
            USD → IDR rate
          </label>
          <input
            id="usd_to_idr_rate"
            name="usd_to_idr_rate"
            type="number"
            step="1"
            min={0}
            required
            defaultValue={currentRate}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-soft">
            e.g. {currentRate.toLocaleString("en-US")} means $1 = {formatIdr(currentRate)}. Example: a
            trip priced at {formatUsd(10)} shows as {formatIdr(usdToIdr(10, currentRate))}.
          </p>
        </div>

        {(updatedByName || settings?.updated_at) && (
          <p className="text-xs text-ink-soft">
            Last changed {settings?.updated_at ? new Date(settings.updated_at).toLocaleString("en-US") : "—"}
            {updatedByName ? ` by ${updatedByName}` : ""}.
          </p>
        )}

        <p className="text-xs text-ink-soft">
          Only affects new prices and checkouts from the moment you save -- it never rewrites the
          IDR amount already charged on a past booking or gift voucher.
        </p>

        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          Save rate
        </button>
      </form>
    </div>
  );
}
