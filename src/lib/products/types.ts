export type ProductType = "tour" | "activity" | "car_hire" | "transport";
export type ProductStatus = "active" | "inactive";

export interface Product {
  id: string;
  product_type: ProductType;
  slug: string;
  title: string;
  excerpt: string | null;
  description: string | null;
  location: string | null;
  category: string | null;
  duration_label: string | null;
  // Structured trip length in days, alongside the free-text
  // duration_label above -- used to compute a booking's
  // service_end_date (src/lib/products/serviceEndDate.ts), which
  // duration_label can't be parsed reliably for. 1 for a single-day
  // trip.
  duration_days: number;
  adult_price_usd: number | null;
  child_price_usd: number | null;
  infant_price_usd: number | null;
  capacity_per_date: number | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  source_url: string | null;
  is_bookable: boolean;
  // How many hours' notice we require before a trip/pickup start
  // before we still accept a new booking -- admin-editable, see the
  // 0036 migration and src/lib/products/leadTime.ts.
  min_lead_hours: number;
  status: ProductStatus;
  // Indonesian machine translation (spec-adjacent, confirmed directly
  // -- see migration 0040). Generated automatically whenever the
  // English fields below change, but only ever shown to customers once
  // translation_status is "approved" -- a "draft" sits unreviewed on
  // the edit page until an admin approves it.
  title_id: string | null;
  excerpt_id: string | null;
  description_id: string | null;
  translation_status: "none" | "draft" | "approved";
  translated_from_title: string | null;
  translated_from_excerpt: string | null;
  translated_from_description: string | null;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  tour: "Tour",
  activity: "Activity",
  car_hire: "Car Hire",
  transport: "Transport",
};
