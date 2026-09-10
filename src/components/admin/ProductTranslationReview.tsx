import type { Product } from "@/lib/products/types";
import {
  approveProductTranslationAction,
  retranslateProductAction,
} from "@/app/admin/(protected)/products/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-teal";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-ink-soft";

const STATUS_LABELS: Record<Product["translation_status"], string> = {
  none: "Not translated yet",
  draft: "Draft — needs your review",
  approved: "Approved — live on /id",
};

const STATUS_BADGE_CLASS: Record<Product["translation_status"], string> = {
  none: "bg-sand text-ink-soft",
  draft: "bg-[#FCE6DD] text-coral-dark",
  approved: "bg-[#E3F2F1] text-teal",
};

/**
 * Sits on the product edit page only (not "new" -- a not-yet-created
 * product has nothing to translate yet; saving it generates the first
 * draft, reviewable here once it exists). A draft is machine-
 * translated automatically whenever the English title/excerpt/
 * description changes (see maybeRetranslateProduct) -- this is purely
 * the review/approve step; nothing here calls Google Translate itself
 * except the explicit "Re-translate" button.
 */
export function ProductTranslationReview({ product }: { product: Product }) {
  return (
    <div className="mt-8 rounded-2xl border border-sand-deep bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-lg font-semibold text-ink">Indonesian translation</h2>
        <span
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[product.translation_status]}`}
        >
          {STATUS_LABELS[product.translation_status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Machine-translated automatically whenever you change the English title, excerpt, or
        description below. Review and edit it here, then approve it to make it visible on the
        Indonesian site (/id) -- nothing here reaches customers until you do.
      </p>

      <form
        action={approveProductTranslationAction.bind(null, product.id)}
        className="mt-4 flex flex-col gap-4"
      >
        <div>
          <label className={labelClass} htmlFor="title_id">
            Title (Indonesian)
          </label>
          <input
            id="title_id"
            name="title_id"
            required
            defaultValue={product.title_id ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="excerpt_id">
            Short summary (Indonesian, optional)
          </label>
          <textarea
            id="excerpt_id"
            name="excerpt_id"
            rows={2}
            defaultValue={product.excerpt_id ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="description_id">
            Full description (Indonesian, optional)
          </label>
          <textarea
            id="description_id"
            name="description_id"
            rows={6}
            defaultValue={product.description_id ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <button type="submit" className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">
            {product.translation_status === "approved" ? "Save changes" : "Approve & publish"}
          </button>
        </div>
      </form>

      <form action={retranslateProductAction.bind(null, product.id)} className="mt-3">
        <button type="submit" className="text-xs font-semibold text-teal hover:underline">
          Re-translate from English now →
        </button>
      </form>
    </div>
  );
}
