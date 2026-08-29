import { requireCustomer } from "@/lib/customers/auth";
import { customerLogoutAction } from "../actions";

/**
 * Spec §6h: Overview, My Bookings, and Profile are all Phase 1;
 * Messages (§6c's chat infra) is now built too. The saved-documents
 * part of Profile (depends on §6b's Rinjani upload) is deliberately
 * not here yet.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await requireCustomer("/account");

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center justify-between border-b border-sand-deep bg-white px-6 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Adventure Lombok Booking
          </p>
          <nav className="mt-1 flex gap-4 font-serif text-sm font-semibold text-ocean">
            <a href="/account">Overview</a>
            <a href="/account/bookings">My Bookings</a>
            <a href="/account/messages">Messages</a>
            <a href="/account/profile">Profile</a>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>{customer.name || customer.email}</span>
          <form action={customerLogoutAction}>
            <button type="submit" className="font-semibold text-coral-dark hover:underline">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
