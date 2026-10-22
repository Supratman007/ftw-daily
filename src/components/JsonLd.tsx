/**
 * Renders a JSON-LD structured-data block (Schema.org) inside a page's
 * <head>-adjacent output -- Next.js hoists a <script> rendered from a
 * Server Component into <head> automatically. `data` is always a
 * value this app built itself (never raw user/admin text rendered
 * unescaped), but JSON.stringify doesn't escape "</script>" sequences
 * on its own -- a product title containing that literal string could
 * otherwise break out of the tag -- so `<` is escaped to < first,
 * which is invisible to any JSON-LD consumer but can't close a tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
