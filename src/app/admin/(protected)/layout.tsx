import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAction } from "./actions";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center justify-between border-b border-sand-deep bg-white px-6 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Adventure Lombok Booking — Admin
          </p>
          <nav className="mt-1 flex gap-4 font-serif text-sm font-semibold text-ocean">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/bookings">Bookings</Link>
            <Link href="/admin/requests">Requests</Link>
            <Link href="/admin/inbox">Inbox</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/discount-codes">Discount codes</Link>
            <Link href="/admin/agents">Sales Agents</Link>
            <Link href="/admin/commissions">Commissions</Link>
            {admin.role === "super_admin" && <Link href="/admin/team">Team</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>{admin.name || admin.email}</span>
          <form action={logoutAction}>
            <button type="submit" className="font-semibold text-coral-dark hover:underline">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
