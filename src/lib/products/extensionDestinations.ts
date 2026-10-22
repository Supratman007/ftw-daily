/**
 * Extension Trips (the homepage's "Extension Trips" nav link) are
 * trips to Indonesian destinations beyond Lombok itself -- there's no
 * dedicated product_type or category field for "is this an extension
 * trip" (product_type is tour/activity/car_hire/transport, which
 * already covers trip *kind*, not destination), so this matches on
 * the existing free-text `location` field instead. A product counts
 * as an extension trip when its location contains one of these place
 * names (case-insensitive substring match, e.g. "Komodo National
 * Park" matches "Komodo"). Add a new destination here as the founder
 * starts selling trips there -- no other code change needed.
 */
export const EXTENSION_TRIP_DESTINATIONS = ["Bali", "Komodo", "Flores", "Sumba", "Java", "Borneo", "Sumatra"];

export function isExtensionTripLocation(location: string | null): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  return EXTENSION_TRIP_DESTINATIONS.some((d) => lower.includes(d.toLowerCase()));
}
