import { NextRequest, NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/bookings/types";
import { resolveReportRange } from "@/lib/reports/dateRange";

/** Quotes a field for CSV only when it actually needs it (contains a
 * comma, quote, or newline) -- doubling any embedded quotes per the
 * standard CSV escaping rule. Same helper as /agent/bookings/export. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type TransactionRow = {
  booking_code: string;
  slot_date: string;
  total_idr: number;
  status: BookingStatus;
  created_at: string;
  products: { title: string } | null;
  customers: { name: string; email: string } | null;
};

/**
 * Same query as the Transactions table on /admin/reports, same
 * preset/from/to params, so a downloaded CSV always matches whatever
 * range was on screen when the button was clicked.
 */
export async function GET(request: NextRequest) {
  await requireAdminSection("reports");
  const { searchParams } = request.nextUrl;
  const range = resolveReportRange(
    searchParams.get("preset") ?? undefined,
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined
  );

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("bookings")
    .select("booking_code, slot_date, total_idr, status, created_at, products(title), customers(name, email)")
    .order("created_at", { ascending: false });
  if (range.from) query = query.gte("created_at", `${range.from}T00:00:00Z`);
  if (range.to) query = query.lte("created_at", `${range.to}T23:59:59Z`);

  const { data } = await query;
  const rows = (data ?? []) as unknown as TransactionRow[];

  const header = ["Purchase date", "Booking code", "Trip", "Trip date", "Customer", "Email", "Total (IDR)", "Status"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.created_at.slice(0, 10),
        r.booking_code,
        r.products?.title ?? "",
        r.slot_date,
        r.customers?.name ?? "",
        r.customers?.email ?? "",
        r.total_idr,
        BOOKING_STATUS_LABELS[r.status],
      ]
        .map(csvField)
        .join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${range.from ?? "all"}-to-${range.to ?? "now"}.csv"`,
    },
  });
}
