/**
 * Browser-side half of error alerting -- see src/instrumentation.ts for
 * the server half and src/lib/alerts/errorAlerts.ts for what happens
 * once an error is reported. Catches anything that reaches a visitor's
 * browser as an uncaught exception or an unhandled promise rejection
 * (a bug an error boundary never even got a chance to render) and
 * reports it to /api/client-error, which funnels into the exact same
 * admin-email pipeline as a server-side error.
 *
 * Deliberately does not add a third-party script here -- same
 * no-new-service reasoning as the rest of this alerting setup.
 */
function reportClientError(message: string, routePath: string) {
  try {
    const body = JSON.stringify({ message: message.slice(0, 500), routePath });
    // sendBeacon fires-and-forgets reliably even if the page is about
    // to unload (a crash right before navigation); fetch() with
    // keepalive isn't guaranteed to complete in every browser in that
    // situation, so it's only the fallback for the rare browser
    // without sendBeacon.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/client-error", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Reporting the error must never itself throw.
  }
}

window.addEventListener("error", (event) => {
  const message = event.error instanceof Error ? event.error.message : String(event.message);
  reportClientError(message, window.location.pathname);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  reportClientError(message, window.location.pathname);
});
