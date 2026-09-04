/** Car Hire & Transport (spec §6a, §6e). Both price by *where* the
 * customer's picked up, not just how many people -- MeetingPoint is
 * the shared pricing key for both. */

export interface MeetingPoint {
  id: string;
  name: string;
  region: string | null;
  status: "active" | "inactive";
}

export interface CarType {
  id: string;
  product_id: string;
  name: string;
  capacity_tier: 4 | 6;
  image_url: string | null;
  features: string[];
  // Marketing copy shown in the product-page detail panel once this
  // car is selected -- description is the full pitch, recommended_for
  // a short one-liner (e.g. "Best for couples & small families").
  description: string | null;
  recommended_for: string | null;
  gallery_urls: string[];
  status: "active" | "inactive";
}

export interface CarPackage {
  id: string;
  car_type_id: string;
  duration_hours: 6 | 8 | 10;
  overtime_rate_per_hour_idr: number;
  status: "active" | "inactive";
}

export interface CarPackagePrice {
  id: string;
  car_package_id: string;
  meeting_point_id: string;
  price_idr: number;
}

/** A Transport product's vehicle/service tiers -- e.g. "Sedan (up to 4
 * pax)" vs "Van (up to 10 pax)", or "Shared Speedboat" vs "Private
 * Speedboat" for a Gili Islands transfer. Same role as CarType above,
 * just without the fixed 4/6-seat regulation constraint. */
export interface TransportVehicleType {
  id: string;
  product_id: string;
  name: string;
  capacity_note: string | null;
  image_url: string | null;
  features: string[];
  description: string | null;
  recommended_for: string | null;
  gallery_urls: string[];
  status: "active" | "inactive";
}

/** A specific route: this vehicle/service type, from one area to
 * another. Point-to-point, not anchored to any one fixed location --
 * a product can hold every route it offers (Airport<->Senggigi,
 * Senggigi<->Tete Batu, ...), same shape as how every competitor's
 * per-route page works, just as rows in one grid instead of separate
 * pages. */
export interface TransportPrice {
  id: string;
  vehicle_type_id: string;
  from_meeting_point_id: string;
  to_meeting_point_id: string;
  price_idr: number;
}

export const CAR_DURATION_OPTIONS = [6, 8, 10] as const;
export const CAR_CAPACITY_TIER_OPTIONS = [4, 6] as const;

/** Where "Other -- enter your address" fits in a meeting-point picker
 * -- not a real meeting_points row, just a sentinel value the
 * <select>'s onChange checks for. */
export const OTHER_MEETING_POINT_VALUE = "other";
