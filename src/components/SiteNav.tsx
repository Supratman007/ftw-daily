"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

export interface SiteNavLink {
  href: string;
  label: string;
  /** "accent" matches the existing coral "Become a Sales Agent" /
   * logout styling; "default" is the teal used for everything else. */
  variant?: "default" | "accent";
}

const linkColorClass: Record<NonNullable<SiteNavLink["variant"]>, string> = {
  default: "hover:text-teal",
  accent: "text-coral-dark hover:text-coral-dark",
};

/**
 * The header's mobile hamburger menu. On desktop the browse links sit
 * inline next to the logo and the account links (login/redeem/become
 * an agent, or account/dashboard/logout once signed in) sit in their
 * own cluster on the right -- SiteHeader.tsx renders both of those
 * itself, unchanged. This component only replaces what phones see: a
 * single hamburger button that opens ONE dropdown with everything --
 * browse links, then a divider, then the account links -- instead of
 * the logo/hamburger row *and* a second wrapping row of account links
 * both always visible, which was the "not clean" mobile header being
 * fixed here. Same drawer-toggle idea as AdminSidebar, a lighter
 * dropdown rather than a full off-canvas panel since this is a
 * handful of links, not fifteen admin sections.
 *
 * Closes on a direct click (backdrop, or the link itself) rather than
 * watching the route with usePathname/useSearchParams: some of these
 * links only change the homepage's `?type=`/`?q=` query string, not
 * the path, so a pathname-only effect (AdminSidebar's approach, fine
 * there since every admin link goes to a different path) wouldn't
 * close it every time, and useSearchParams would need this component
 * wrapped in Suspense for no real benefit over just closing on click.
 */
export function SiteNav({
  links,
  accountLinks,
  logoutSlot,
  openLabel,
  closeLabel,
}: {
  links: SiteNavLink[];
  /** Login/redeem/become-an-agent, or account/dashboard once signed
   * in -- shown only inside the mobile panel; SiteHeader.tsx still
   * renders its own desktop copy separately. */
  accountLinks: SiteNavLink[];
  /** The bound logout <form>, pre-rendered server-side (it needs the
   * "use server" action, not something this client component can
   * call) -- only present when a customer is signed in. Mobile-panel
   * only, same reasoning as accountLinks. */
  logoutSlot?: ReactNode;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: a plain inline row next to the logo. */}
      <nav className="hidden flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold text-ink-soft sm:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-teal">
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mobile: hamburger button + dropdown panel. The panel is
          absolutely positioned against <header> (the nearest
          "relative" ancestor -- see SiteHeader.tsx), so it always
          spans the full header width and sits directly below it,
          regardless of where this button lands in the header's own
          flex layout. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sand-deep text-ink sm:hidden"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-ink/30 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-sand-deep bg-white px-6 py-3 shadow-lg sm:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-semibold text-ink-soft hover:bg-sand hover:text-teal"
              >
                {link.label}
              </Link>
            ))}

            {(accountLinks.length > 0 || logoutSlot) && (
              <div className="my-1 border-t border-sand-deep" aria-hidden="true" />
            )}
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-2 py-2 text-sm font-semibold hover:bg-sand ${linkColorClass[link.variant ?? "default"]}`}
              >
                {link.label}
              </Link>
            ))}
            {logoutSlot && <div className="px-2">{logoutSlot}</div>}
          </nav>
        </>
      )}
    </>
  );
}
