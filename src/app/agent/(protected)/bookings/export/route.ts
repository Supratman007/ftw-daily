import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Quotes a field for CSV only when it actually needs it (contains a
 * comma, quote, or newline) -- doubling any embedded quotes per the
 * standard CSV escaping rule. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Same query as /agent/bookings itself, same from/to/status filters,
 * so a downloaded CSV always matches whatever was on screen when the
 * agent clicked "Download CSV".
 */
export async function GET(request: NextRequest) {
  const agent = await requireAgent();
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const commissionStatus = status === "pending" || status === "paid" ? status : "all";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("bookings")
    .select(
      "booking_code, slot_date, pax_count, total_idr, commission_amount_usd, commission_status, created_at, products(title), customers(name)"
    )
    .eq("referred_by_agent_id", agent.id)
    .eq("status", "paid_confirmed")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (commissionStatus !== "all") query = query.eq("commission_status", commissionStatus);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Array<{
    booking_code: string;
    slot_date: string;
    pax_count: number;
    total_idr: number;
    commission_amount_usd: number | null;
    commission_status: string | null;
    created_at: string;
    products: { title: string } | null;
    customers: { name: string } | null;
  }>;

  const header = [
    "Purchase date",
    "Booking code",
    "Trip",
    "Trip date",
    "Travelers",
    "Customer",
    "Total (IDR)",
    "Commission (USD)",
    "Commission status",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.created_at.slice(0, 10),
        r.booking_code,
        r.products?.title ?? "",
        r.slot_date,
        r.pax_count,
        r.customers?.name ?? "",
        r.total_idr,
        r.commission_amount_usd ?? "",
        r.commission_status === "paid" ? "Paid" : "Pending",
      ]
        .map(csvField)
        .join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-report-${agent.referral_code}.csv"`,
    },
  });
}
