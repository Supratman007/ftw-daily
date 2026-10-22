import sanitizeHtml from "sanitize-html";

/**
 * The product "Full description" field (and its Indonesian
 * translation, description_id) is now rich text -- HTML produced by
 * the WYSIWYG editor in the admin (src/components/admin/
 * RichTextEditor.tsx), stored as-is and rendered with
 * dangerouslySetInnerHTML on the public product page. Only admins can
 * submit it today, but sanitizing on the way in (not just trusting
 * the editor) is cheap insurance -- against a compromised admin
 * account, a future contributor who forgets this field is no longer
 * plain text, or a browser extension mangling the form before submit.
 *
 * The allowlist matches exactly what RichTextEditor's toolbar can
 * produce (headings 1-3, bold, italic, underline, links, bullet/
 * numbered lists) plus a couple of tags a paste from Word/WordPress
 * commonly carries (br, plain b/i). Anything else -- scripts, iframes,
 * images, inline styles/event handlers, tables -- is stripped, though
 * its text content is kept rather than dropping the whole paragraph.
 */
export function sanitizeDescriptionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["h1", "h2", "h3", "p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li"],
    allowedAttributes: {
      // target/rel aren't something the editor itself sets -- they're
      // added by transformTags below, but still have to be in this
      // list or sanitize-html strips them right back off again.
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
    // Empty elements (an <li> or heading left blank) aren't unsafe,
    // just noise -- strip tags with nothing in them so a half-cleared
    // paragraph doesn't linger as an empty gap on the page.
    exclusiveFilter: (frame) => frame.tag !== "br" && !frame.text.trim() && frame.mediaChildren.length === 0,
  }).trim();
}

/** True when sanitized HTML has no actual visible content -- Tiptap's
 * "empty" document still serializes to "<p></p>", which needs to be
 * treated the same as an empty textarea would have been (store null,
 * not a meaningless empty tag). */
export function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim() === "";
}

/** Sanitizes, then collapses a blank result to null -- the one-call
 * version every write path (the form, a machine translation, a
 * re-translate) actually wants before it reaches the database. */
export function sanitizeDescriptionHtmlOrNull(html: string): string | null {
  const clean = sanitizeDescriptionHtml(html);
  return isBlankHtml(clean) ? null : clean;
}
