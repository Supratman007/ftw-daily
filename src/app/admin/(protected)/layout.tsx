import { ADMIN_SECTION_ROLES, requireAdmin, type AdminSection } from "@/lib/admin/auth";
import { AdminSidebar, type AdminNavLink } from "@/components/admin/AdminSidebar";
import { logoutAction } from "./actions";

const ICON_STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const NAV_LINKS: Array<{ href: string; label: string; section: AdminSection; icon: React.ReactNode }> = [
  {
    href: "/admin/bookings",
    label: "Bookings",
    section: "bookings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 3v4M16 3v4" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/admin/pickups",
    label: "Pickups",
    section: "pickups",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M12 2l7 18-7-4-7 4z" />
      </svg>
    ),
  },
  {
    href: "/admin/requests",
    label: "Requests",
    section: "requests",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
        <path d="M9 11h6M9 15h6" />
      </svg>
    ),
  },
  {
    href: "/admin/inbox",
    label: "Inbox",
    section: "inbox",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-5 4V6a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    href: "/admin/cancellations",
    label: "Cancellations",
    section: "cancellations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    ),
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    section: "moderation",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M6 21V4" />
        <path d="M6 4h11l-2.5 4L17 12H6" />
      </svg>
    ),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    section: "reports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M5 20V12M12 20V6M19 20v-5" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    section: "analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </svg>
    ),
  },
  {
    href: "/admin/vouchers",
    label: "Vouchers",
    section: "vouchers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <rect x="4" y="9" width="16" height="11" rx="1" />
        <path d="M4 9h16M12 9v11" />
        <path d="M12 9c-1.5-4-6-4-6-1s3 1 6 1zM12 9c1.5-4 6-4 6-1s-3 1-6 1z" />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "Products",
    section: "products",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M3 8l9-5 9 5-9 5-9-5z" />
        <path d="M3 8v9l9 5 9-5V8" />
        <path d="M12 13v9" />
      </svg>
    ),
  },
  {
    href: "/admin/meeting-points",
    label: "Meeting points",
    section: "meeting_points",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/admin/discount-codes",
    label: "Discount codes",
    section: "discount_codes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <path d="M3 12l9-9h7v7l-9 9-7-7z" />
        <circle cx="16" cy="7" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/admin/agents",
    label: "Sales Agents",
    section: "agents",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M15.5 14.2c2.5.4 4.5 2.4 4.5 5.8" />
      </svg>
    ),
  },
  {
    href: "/admin/commissions",
    label: "Commissions",
    section: "commissions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
        <circle cx="7" cy="7" r="2.2" />
        <circle cx="17" cy="17" r="2.2" />
        <path d="M18 6L6 18" />
      </svg>
    ),
  },
];

const TEAM_LINK: AdminNavLink = {
  href: "/admin/team",
  label: "Team",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.5 2.7-6.3 6-6.3s6 2.8 6 6.3" />
      <path d="M18 8v6M15 11h6" />
    </svg>
  ),
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const links: AdminNavLink[] = NAV_LINKS.filter((link) =>
    ADMIN_SECTION_ROLES[link.section].includes(admin.role)
  ).map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <div className="flex min-h-screen flex-col bg-sand md:flex-row">
      <AdminSidebar
        links={links}
        teamLink={admin.role === "super_admin" ? TEAM_LINK : null}
        adminName={admin.name || admin.email}
        logoutForm={
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-coral-dark hover:bg-sand"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_STROKE}>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Log out
            </button>
          </form>
        }
      />
      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
