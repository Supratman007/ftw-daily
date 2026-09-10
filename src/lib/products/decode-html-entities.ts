/** Content pasted into the admin form often comes from WordPress (or
 * other HTML sources), which stores punctuation as HTML entities rather
 * than the actual character -- e.g. "Klotok &#038; Reforestation" instead
 * of "Klotok & Reforestation". Decodes both the numeric form (&#038;,
 * &#8217;) and the handful of named entities WordPress commonly emits,
 * so what gets saved is the actual character, not the HTML code for it. */
export function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
  };

  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}
