"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSED_KEY = "alb_cookie_notice_dismissed";

/**
 * A simple, non-blocking cookie notice -- shows once, dismisses
 * permanently (remembered in localStorage, not a cookie itself, so
 * dismissing it doesn't need to set one). No consent gate on the
 * cookies themselves: everything this site sets (language preference,
 * the visitor tracker, agent referral, Supabase's own login session)
 * is either essential to the site working or a simple, anonymous
 * counter, so this is a plain-language disclosure rather than an
 * accept/reject choice.
 */
export function CookieNotice({
  message,
  learnMoreHref,
  learnMoreLabel,
  acceptLabel,
}: {
  message: string;
  learnMoreHref: string;
  learnMoreLabel: string;
  acceptLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  // Reading localStorage (an external system, unavailable during SSR)
  // and syncing it into component state is exactly what an effect is
  // for -- there's no way to know whether this was already dismissed
  // until the client mounts. react-hooks/set-state-in-effect's general
  // "derive it during render instead" advice doesn't apply here: the
  // value genuinely isn't known during the render itself.
  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISSED_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
      }
    } catch {
      // Storage blocked (private window, etc.) -- just don't show it
      // rather than risk it reappearing every single page.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Same "never let this break the page" reasoning as elsewhere.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-sand-deep bg-white px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
        <p className="flex-1">
          {message}{" "}
          <Link href={learnMoreHref} className="font-semibold text-teal hover:underline">
            {learnMoreLabel}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}
