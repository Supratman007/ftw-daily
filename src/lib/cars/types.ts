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

export interface TransportPrice {
  id: string;
  product_id: string;
  meeting_point_id: string;
  price_idr: number;
}

export const CAR_DURATION_OPTIONS = [6, 8, 10] as const;
export const CAR_CAPACITY_TIER_OPTIONS = [4, 6] as const;

/** Where "Other -- enter your address" fits in a meeting-point picker
 * -- not a real meeting_points row, just a sentinel value the
 * <select>'s onChange checks for. */
export const OTHER_MEETING_POINT_VALUE = "other";
