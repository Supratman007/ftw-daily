import Link from "next/link";
import Image from "next/image";
import { ADMIN_SECTION_ROLES, requireAdmin, type AdminSection } from "@/lib/admin/auth";
import { logoutAction } from "./actions";

const NAV_LINKS: Array<{ href: string; label: string; section: AdminSection }> = [
  { href: "/admin/bookings", label: "Bookings", section: "bookings" },
  { href: "/admin/pickups", label: "Pickups", section: "pickups" },
  { href: "/admin/requests", label: "Requests", section: "requests" },
  { href: "/admin/inbox", label: "Inbox", section: "inbox" },
  { href: "/admin/cancellations", label: "Cancellations", section: "cancellations" },
  { href: "/admin/moderation", label: "Moderation", section: "moderation" },
  { href: "/admin/reports", label: "Reports", section: "reports" },
  { href: "/admin/analytics", label: "Analytics", section: "analytics" },
  { href: "/admin/vouchers", label: "Vouchers", section: "vouchers" },
  { href: "/admin/products", label: "Products", section: "products" },
  { href: "/admin/meeting-points", label: "Meeting points", section: "meeting_points" },
  { href: "/admin/discount-codes", label: "Discount codes", section: "discount_codes" },
  { href: "/admin/agents", label: "Sales Agents", section: "agents" },
  { href: "/admin/commissions", label: "Commissions", section: "commissions" },
];

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex flex-col gap-3 border-b border-sand-deep bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="Adventure Lombok Booking"
              width={120}
              height={36}
              className="h-8 w-auto sm:h-9"
            />
            <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">Admin</span>
          </Link>
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-serif text-sm font-semibold text-ocean">
            <Link href="/admin">Overview</Link>
            {NAV_LINKS.filter((link) => ADMIN_SECTION_ROLES[link.section].includes(admin.role)).map(
              (link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              )
            )}
            {admin.role === "super_admin" && <Link href="/admin/team">Team</Link>}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
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
