import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import type { Product } from "@/lib/products/types";
import { startCheckoutAction } from "./actions";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; pax?: string; discount_code?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { date, pax, discount_code: discountCode, error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!product) {
    notFound();
  }

  const p = product as Product;
  const adultPriceUsd = p.adult_price_usd ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {p.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- prototype-stage product page; Next/Image optimization is a later polish pass
        <img
          src={p.cover_image_url}
          alt=""
          className="mb-6 h-72 w-full rounded-2xl object-cover"
        />
      )}

      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            {p.location} {p.duration_label ? `· ${p.duration_label}` : ""}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{p.title}</h1>
          {p.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {p.description}
            </p>
          )}
        </div>

        <div className="h-fit rounded-2xl border border-sand-deep bg-white p-6">
          <div className="font-serif text-2xl font-bold text-ocean">
            {formatUsd(adultPriceUsd)}{" "}
            <span className="text-sm font-normal text-ink-soft">
              ({formatIdr(usdToIdr(adultPriceUsd))}) / person
            </span>
          </div>
          <div className="my-4 h-px bg-sand-deep" />

          {error && (
            <p className="mb-4 rounded-lg border border-coral bg-[#FCE6DD] p-3 text-sm text-coral-dark">
              {error}
            </p>
          )}

          {!p.is_bookable ? (
            <p className="text-sm text-ink-soft">
              This trip needs manual confirmation before booking — please contact us directly for
              now.
            </p>
          ) : (
            <form action={startCheckoutAction.bind(null, p.id, p.slug)} className="flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Date
                <input
                  type="date"
                  name="date"
                  required
                  min={tomorrow()}
                  defaultValue={date ?? tomorrow()}
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Travelers
                <input
                  type="number"
                  name="pax"
                  min={1}
                  required
                  defaultValue={pax ?? "2"}
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Discount code (optional)
                <input
                  type="text"
                  name="discount_code"
                  defaultValue={discountCode ?? ""}
                  placeholder="e.g. WELCOME10"
                  className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm uppercase"
                  style={{ textTransform: "uppercase" }}
                />
              </label>
              <button
                type="submit"
                className="mt-2 rounded-lg bg-coral px-4 py-3 text-sm font-semibold text-white"
              >
                Continue to checkout
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
