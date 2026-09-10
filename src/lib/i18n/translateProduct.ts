import "server-only";
import { translateToIndonesian } from "./googleTranslate";

export interface ProductTranslationFields {
  title_id: string | null;
  excerpt_id: string | null;
  description_id: string | null;
  translation_status: "none" | "draft" | "approved";
  translated_from_title: string | null;
  translated_from_excerpt: string | null;
  translated_from_description: string | null;
}

/**
 * Called from createProductAction/updateProductAction (src/app/admin/
 * (protected)/products/actions.ts) right after building the English
 * row. If the English title/excerpt/description differ from whatever
 * they were the last time a translation was generated (or there's
 * never been one), machine-translates fresh Indonesian text and
 * returns fields to merge into the insert/update -- marked "draft" so
 * it won't show to Indonesian customers until an admin reviews and
 * approves it (see ProductTranslationReview). Returns {} (no fields
 * to change) when the English content hasn't changed, or when
 * translation fails for any reason -- a failed attempt never blocks
 * saving the product itself; the admin can retry with the "Re-
 * translate" button on the edit page.
 */
export async function maybeRetranslateProduct(
  english: { title: string; excerpt: string | null; description: string | null },
  existing: {
    translated_from_title: string | null;
    translated_from_excerpt: string | null;
    translated_from_description: string | null;
  } | null
): Promise<Partial<ProductTranslationFields>> {
  const needsTranslation =
    !existing ||
    existing.translated_from_title !== english.title ||
    (existing.translated_from_excerpt ?? "") !== (english.excerpt ?? "") ||
    (existing.translated_from_description ?? "") !== (english.description ?? "");

  if (!needsTranslation) return {};

  try {
    const [titleId, excerptId, descriptionId] = await translateToIndonesian([
      english.title,
      english.excerpt ?? "",
      english.description ?? "",
    ]);
    return {
      title_id: titleId || null,
      excerpt_id: excerptId || null,
      description_id: descriptionId || null,
      translation_status: "draft",
      translated_from_title: english.title,
      translated_from_excerpt: english.excerpt,
      translated_from_description: english.description,
    };
  } catch (err) {
    console.error("Product translation failed:", err);
    return {};
  }
}
