"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

export interface AccountMenuItem {
  href: string;
  label: string;
  variant?: "default" | "accent" | "muted";
  /** Draws a divider above this item -- used to separate the
   * account-proper links (sign in/account/redeem) from the
   * agent/staff/support links below them, same grouping the old
   * always-visible link row implied through spacing alone. */
  dividerBefore?: boolean;
}

const itemColorClass: Record<NonNullable<AccountMenuItem["variant"]>, string> = {
  default: "text-ink hover:bg-sand",
  accent: "text-coral-dark hover:bg-sand",
  muted: "text-ink-soft hover:bg-sand",
};

/**
 * The desktop header's single "Account" dropdown -- replaces what used
 * to be a wrapping row of up to five separate links (Log in, Become a
 * Sales Agent, Staff login, Agent login, Redeem a voucher) sitting
 * directly in the header. Same shape as the reference header this was
 * asked to match: an icon + label + chevron trigger, one dropdown
 * panel with every account-related link grouped inside it.
 *
 * Mobile is unaffected -- SiteNav's hamburger panel still gets the
 * same links as a flat list (SiteHeader.tsx passes both this
 * component's `items` and that flat list from the same source data),
 * since a dropdown-inside-a-dropdown-inside-a-hamburger-panel would be
 * one collapsing layer too many on a small screen.
 */
export function HeaderAccountMenu({
  label,
  items,
  logoutSlot,
}: {
  label: string;
  items: AccountMenuItem[];
  /** The bound logout <form>, pre-rendered server-side by SiteHeader.tsx
   * (it needs the "use server" action, not something this client
   * component can call) -- only present when a customer is signed in. */
  logoutSlot?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-sand"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          aria-hidden="true"
        >
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-sand-deep bg-white py-1.5 shadow-lg"
        >
          {items.map((item) => (
            <div key={item.href}>
              {item.dividerBefore && <div className="my-1.5 border-t border-sand-deep" aria-hidden="true" />}
              <Link
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm font-semibold ${itemColorClass[item.variant ?? "default"]}`}
              >
                {item.label}
              </Link>
            </div>
          ))}
          {logoutSlot && (
            <div className="mt-1.5 border-t border-sand-deep px-4 pt-1.5">{logoutSlot}</div>
          )}
        </div>
      )}
    </div>
  );
}
