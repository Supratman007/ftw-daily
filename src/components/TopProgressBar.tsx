"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The thin colored bar that sweeps across the very top of the page on
 * every navigation -- same idea as the one the user pointed out on
 * Bookmundi (and the same pattern GitHub/YouTube/etc. use), in our
 * own brand color rather than copying theirs. Mounted once in the
 * root layout, so it covers every page: admin, agent, the customer
 * account area, and the public site.
 *
 * There's no single Next.js event for "a navigation started" that
 * covers every way a click can trigger one (a <Link>, a plain <a>, a
 * form action/Server Action submit), so this listens at the document
 * level instead of wiring every individual link/button:
 *  - a "click" on any same-origin, same-tab <a> starts it
 *  - a "submit" on any <form> starts it too (most primary actions in
 *    this app -- login, checkout, every admin "Save changes" -- are
 *    form submits, not <Link> navigations)
 * and finishes it once the URL actually changes (App Router updates
 * pathname/searchParams on completion, including a same-page filter
 * change like "?type=tour", and on browser back/forward).
 *
 * A submit that *doesn't* change the URL (an admin save that just
 * revalidates the current page) would otherwise leave the bar stuck
 * forever waiting for a navigation that isn't coming -- the fallback
 * timer below is what catches that case.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRouteKey = useRef(routeKey);

  function clearTimers() {
    if (trickleTimer.current) clearInterval(trickleTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    if (finishTimer.current) clearTimeout(finishTimer.current);
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress(15);
    // Trickle toward (not to) 90% -- the remaining 10% is reserved for
    // the actual "done" snap, so it never looks finished prematurely.
    trickleTimer.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(1, (90 - p) * 0.1)));
    }, 200);
    // A save/action that never changes the URL would otherwise leave
    // this stuck at ~90% forever -- cut it off after a few seconds.
    fallbackTimer.current = setTimeout(finish, 4000);
  }

  function finish() {
    if (trickleTimer.current) clearInterval(trickleTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    setProgress(100);
    finishTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    function onSubmit() {
      // No defaultPrevented check here (unlike onClick above): React
      // itself calls preventDefault() on a <form action={...}> submit
      // as part of handling the action -- confirmed empirically, not
      // assumed -- so by the time this listener sees the event,
      // e.defaultPrevented is already true for every ordinary Server
      // Action form submit in this app (most of its "buttons" are
      // exactly that: login, checkout, every admin Save). Guarding on
      // it here would silently skip the bar for almost everything it's
      // meant to cover.
      start();
    }
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevRouteKey.current !== routeKey) {
      prevRouteKey.current = routeKey;
      finish();
    }
  }, [routeKey]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[100] h-[3px] bg-coral shadow-[0_0_8px_rgba(225,97,60,0.6)]"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
        transition: "width 200ms ease-out, opacity 200ms ease-out",
      }}
    />
  );
}
