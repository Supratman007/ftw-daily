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
  adult_price_usd: number | null;
  child_price_usd: number | null;
  infant_price_usd: number | null;
  capacity_per_date: number | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  source_url: string | null;
  is_bookable: boolean;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  tour: "Tour",
  activity: "Activity",
  car_hire: "Car Hire",
  transport: "Transport",
};
