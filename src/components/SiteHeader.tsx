import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerLogoutAction } from "@/app/actions";

/**
 * Compact top bar shared across every customer-facing page (homepage,
 * product pages, ...) -- without this, a page other than the homepage
 * had no login/account link at all, so a customer redirected back here
 * mid-checkout had no way to reach /account.
 */
export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-sand-deep bg-white px-6 py-4">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-ink-soft hover:text-ink"
      >
        Adventure Lombok Booking
      </Link>
      <div className="text-sm">
        {user ? (
          <div className="flex items-center gap-3 text-ink-soft">
            <Link href="/account" className="font-semibold text-teal hover:underline">
              My account
            </Link>
            <form action={customerLogoutAction}>
              <button type="submit" className="font-semibold text-coral-dark hover:underline">
                Log out
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="font-semibold text-teal hover:underline">
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
