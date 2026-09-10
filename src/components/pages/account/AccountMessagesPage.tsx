import Link from "next/link";
import { requireCustomer } from "@/lib/customers/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

type ConversationWithContext = {
  id: string;
  status: "open" | "resolved";
  updated_at: string;
  booking_id: string | null;
  bookings: { booking_code: string; products: { title: string } | null } | null;
};

/**
 * Shared by src/app/account/messages/page.tsx (English) and
 * src/app/id/account/messages/page.tsx (Indonesian). Spec §6c's
 * "customer-side Messages tab" -- a shortlist across every booking
 * this customer has a thread on (most have none, and never will; this
 * is for when there's more than one). The actual thread lives on the
 * booking detail page itself, so this just links there rather than
 * re-rendering messages in a second place.
 */
export async function AccountMessagesPage({ locale }: { locale: Locale }) {
  const pathPrefix = locale === "id" ? "/id" : "";
  const customer = await requireCustomer(`${pathPrefix}/account/messages`);
  const supabase = await createSupabaseServerClient();
  const dict = getDictionary(locale).account.messages;

  const { data } = await supabase
    .from("conversations")
    .select("id, status, updated_at, booking_id, bookings(booking_code, products(title))")
    .eq("kind", "customer_booking")
    .order("updated_at", { ascending: false });

  const conversations = (data ?? []) as unknown as ConversationWithContext[];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">{dict.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.signedInAs(customer.email)}</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-sand-deep bg-white">
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">{dict.noConversations}</p>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.id}
              href={`${pathPrefix}/account/booking/${c.booking_id}`}
              className="flex items-center justify-between border-t border-sand-deep px-4 py-3 text-sm first:border-t-0 hover:bg-sand"
            >
              <div>
                <p className="font-semibold text-ink">{c.bookings?.products?.title ?? "Trip"}</p>
                <p className="text-ink-soft">{c.bookings?.booking_code}</p>
              </div>
              <div className="text-right text-xs text-ink-soft">
                <p>{c.status === "resolved" ? dict.resolved : dict.open}</p>
                <p>{new Date(c.updated_at).toLocaleDateString()}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
