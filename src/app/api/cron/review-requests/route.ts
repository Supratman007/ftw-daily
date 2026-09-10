import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { sendReviewRequestEmail } from "@/lib/email/resend";
import { REVIEW_TOKEN_EXPIRY_DAYS } from "@/lib/reviews/types";
import { lombokDateString } from "@/lib/timezone";

/**
 * Spec §6d/§6g: once a day, find every booking whose trip just ended
 * (service_end_date = today, in Lombok time) and send the
 * review-request email -- no delay, same day the service ends.
 * Scheduled by vercel.json's crons entry; Vercel calls this with the
 * Authorization header below automatically once CRON_SECRET is set as
 * an env var, so that's what's checked rather than the Xendit
 * webhook's own signature scheme.
 *
 * review_requested_at is the dedupe flag -- set the moment the email
 * goes out, so a booking never gets invited twice even if this job
 * runs again on the same day (a redeploy, a manual retrigger, ...).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const today = lombokDateString();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, customers(name, email, preferred_locale), products(title)")
    .eq("status", "paid_confirmed")
    .eq("service_end_date", today)
    .is("review_requested_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const expiresAt = new Date(Date.now() + REVIEW_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  let sent = 0;

  for (const booking of bookings ?? []) {
    const customer = booking.customers as unknown as {
      name: string;
      email: string;
      preferred_locale: "en" | "id";
    } | null;
    const product = booking.products as unknown as { title: string } | null;
    if (!customer || !product) continue;

    const token = crypto.randomUUID();
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        review_token: token,
        review_token_expires_at: expiresAt.toISOString(),
        review_requested_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    if (updateError) continue;

    await sendReviewRequestEmail({
      toEmail: customer.email,
      customerName: customer.name,
      productTitle: product.title,
      reviewUrl: `${siteUrl}/review/${token}`,
      locale: customer.preferred_locale,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, checked: bookings?.length ?? 0, sent });
}
