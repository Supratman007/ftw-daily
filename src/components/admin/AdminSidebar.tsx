"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export interface AdminNavLink {
  href: string;
  label: string;
  icon: ReactNode;
}

const navRowClass =
  "flex items-center gap-3 rounded-lg px-3 py-2 font-sans text-sm font-medium text-ink-soft transition hover:bg-sand hover:text-ink";
const navRowActiveClass = "flex items-center gap-3 rounded-lg bg-ocean px-3 py-2 font-sans text-sm font-medium text-white";

/** A link is "active" on its own page and every page nested under it
 * (e.g. a booking's detail page still highlights "Bookings") -- exact
 * match only for Overview, since every admin path starts with /admin
 * and would otherwise always match it. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Replaces the old wrapping top nav bar (16+ links in one row was
 * already awkward, per the design mockup the user approved) with a
 * left sidebar -- the standard pattern for an admin panel with this
 * many sections. On phone-width screens the sidebar becomes a
 * slide-out drawer behind a hamburger button instead of eating most
 * of the screen width permanently; it auto-closes on navigation so it
 * never lingers open over the page you just went to.
 */
export function AdminSidebar({
  links,
  teamLink,
  adminName,
  logoutForm,
}: {
  links: AdminNavLink[];
  teamLink: AdminNavLink | null;
  adminName: string;
  logoutForm: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Closing the drawer after a navigation genuinely depends on the new
  // pathname, which isn't known until the route has actually changed.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  const overviewLink: AdminNavLink = {
    href: "/admin",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9" />
      </svg>
    ),
  };
  const allLinks = teamLink ? [overviewLink, ...links, teamLink] : [overviewLink, ...links];

  return (
    <>
      {/* Mobile-only top bar -- the sidebar itself is off-screen below
          md, so this is the only way to reach the menu or the logo on
          a phone. */}
      <div className="flex items-center justify-between border-b border-sand-deep bg-white px-4 py-3 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="Adventure Lombok Booking" width={120} height={36} className="h-7 w-auto" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-sand-deep p-2 text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col border-r border-sand-deep bg-white p-4 transition-transform duration-200 md:relative md:translate-x-0 ${open ? "translate-x-0" : ""}`}
      >
        <Link href="/admin" className="hidden items-center gap-2 px-1 pb-4 md:flex">
          <Image src="/logo.jpg" alt="Adventure Lombok Booking" width={120} height={36} className="h-9 w-auto" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Admin</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {allLinks.map((link) => (
            <Link key={link.href} href={link.href} className={isActive(pathname, link.href) ? navRowActiveClass : navRowClass}>
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-3 border-t border-sand-deep pt-3">
          <p className="truncate px-3 text-xs text-ink-soft">{adminName}</p>
          <div className="mt-1">{logoutForm}</div>
        </div>
      </aside>
    </>
  );
}
