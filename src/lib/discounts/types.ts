export type DiscountType = "percent" | "fixed_usd";

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Percentage off",
  fixed_usd: "Fixed amount off (USD)",
};
