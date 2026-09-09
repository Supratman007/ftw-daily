export type ReportPreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "all_time"
  | "custom";

export const REPORT_PRESETS: Array<{ value: ReportPreset; label: string }> = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_week", label: "This week" },
  { value: "today", label: "Today" },
  { value: "this_year", label: "This year" },
  { value: "all_time", label: "All time" },
];

export interface ResolvedRange {
  preset: ReportPreset;
  /** Inclusive, yyyy-mm-dd. Null only for "all_time" (no lower bound). */
  from: string | null;
  /** Inclusive, yyyy-mm-dd. Null only for "all_time" (no upper bound). */
  to: string | null;
  label: string;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolves a preset (or an explicit from/to pair for "custom") into
 * actual dates. Everything here uses UTC day boundaries -- the server
 * always runs in UTC (Vercel), and every date column this reads
 * (bookings.created_at, cancellation_requests.reviewed_at,
 * gift_vouchers.issued_at/refunded_at) is a timestamptz compared the
 * same way, so staying in UTC keeps "today"/"this month" consistent
 * with the rest of the app rather than drifting by Lombok's +8 offset.
 * Shared by the reports page and its CSV export route so a download
 * always matches whatever range is on screen.
 */
export function resolveReportRange(
  presetParam: string | undefined,
  fromParam: string | undefined,
  toParam: string | undefined
): ResolvedRange {
  const now = new Date();
  const todayStr = ymd(now);

  if (presetParam === "custom" && fromParam && toParam) {
    return { preset: "custom", from: fromParam, to: toParam, label: `${fromParam} to ${toParam}` };
  }

  const preset: ReportPreset = REPORT_PRESETS.some((p) => p.value === presetParam)
    ? (presetParam as ReportPreset)
    : "this_month";

  if (preset === "today") {
    return { preset, from: todayStr, to: todayStr, label: "Today" };
  }
  if (preset === "this_week") {
    const day = now.getUTCDay(); // 0 = Sunday
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset)
    );
    return { preset, from: ymd(monday), to: todayStr, label: "This week" };
  }
  if (preset === "this_month") {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { preset, from: ymd(first), to: todayStr, label: "This month" };
  }
  if (preset === "last_month") {
    const firstThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthEnd = new Date(firstThisMonth.getTime() - 86_400_000);
    const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1));
    return { preset, from: ymd(lastMonthStart), to: ymd(lastMonthEnd), label: "Last month" };
  }
  if (preset === "this_year") {
    const first = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { preset, from: ymd(first), to: todayStr, label: "This year" };
  }
  // all_time
  return { preset: "all_time", from: null, to: null, label: "All time" };
}
