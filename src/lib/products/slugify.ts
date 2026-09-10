/** Turns a title into a URL-friendly slug, e.g. "Gili Islands Tour!" ->
 * "gili-islands-tour". Used to suggest a default slug in the admin form
 * (still editable by hand) and as a server-side fallback if one wasn't
 * provided. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
