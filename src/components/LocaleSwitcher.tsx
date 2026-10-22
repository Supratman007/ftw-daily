"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT_LABELS, type Locale } from "@/lib/i18n/locales";

function hrefFor(locale: Locale, basePath: string): string {
  if (locale === "en") {
    // ?lang=en overrides a previously-stored "id" cookie -- without
    // it, landing back on the bare path with that cookie still set
    // would just bounce straight back to /id (see proxy.ts). Visiting
    // /id directly doesn't have the equivalent problem (it's never a
    // redirect target itself), so only this direction needs it.
    return `${basePath}${basePath.includes("?") ? "&" : "?"}lang=en`;
  }
  return basePath === "/" ? "/id" : `/id${basePath}`;
}

/**
 * Swaps between the English (unprefixed) and Indonesian (/id-prefixed)
 * versions of the *same* page. `basePath` is that page's own path with
 * no locale prefix (e.g. "/" for the homepage) -- only render this on
 * a page that actually has both versions; linking to an /id page that
 * doesn't exist yet would just 404.
 *
 * A click-to-open dropdown (globe icon + current code + chevron, same
 * shape as the Account menu next to it in SiteHeader.tsx) rather than
 * always-visible EN/ID buttons -- with only two locales the difference
 * is cosmetic today, but it keeps the header down to two compact
 * triggers instead of a always-expanded pill, matching the reference
 * header this was asked to follow.
 */
export function LocaleSwitcher({ locale, basePath }: { locale: Locale; basePath: string }) {
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
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-soft hover:bg-sand hover:text-ink"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" />
        </svg>
        {LOCALE_SHORT_LABELS[locale]}
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
          className="absolute right-0 top-full z-40 mt-2 w-44 rounded-xl border border-sand-deep bg-white py-1 shadow-lg"
        >
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={hrefFor(l, basePath)}
              role="menuitem"
              aria-current={l === locale ? "true" : undefined}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 text-sm ${
                l === locale ? "font-semibold text-teal" : "text-ink-soft hover:bg-sand hover:text-ink"
              }`}
            >
              {LOCALE_LABELS[l]}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
