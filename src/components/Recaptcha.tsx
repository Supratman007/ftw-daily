"use client";

import { useEffect, useRef } from "react";
import { RECAPTCHA_SITE_KEY } from "@/lib/recaptcha";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        params: { sitekey: string }
      ) => number;
    };
    // Google's script calls this once it's fully loaded and
    // window.grecaptcha is actually ready to use -- passed as the
    // script's own `onload` query param below rather than polling,
    // since grecaptcha can otherwise exist as a stub object before
    // render() is actually callable.
    __onRecaptchaLoad?: () => void;
  }
}

const SCRIPT_ID = "recaptcha-script";

/**
 * Drop this inside any <form> right before the submit button -- it
 * renders Google's "I'm not a robot" checkbox and, once checked,
 * automatically adds a hidden g-recaptcha-response field that submits
 * as part of the form. The matching server-side check is
 * verifyRecaptcha() in lib/recaptchaVerify.ts, called from the
 * Server Action each of these forms posts to.
 *
 * Explicit render (grecaptcha.render(...) called from a script
 * onload callback) rather than the simpler "just drop a
 * <div class="g-recaptcha">" implicit approach -- the implicit one
 * scans the DOM once when Google's script finishes loading, which
 * races against React mounting this div and silently renders nothing
 * if this component wasn't already in the DOM at that exact moment.
 * Explicit render sidesteps that entirely.
 */
export function Recaptcha() {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    function renderWidget() {
      if (renderedRef.current || !containerRef.current || !window.grecaptcha) return;
      renderedRef.current = true;
      window.grecaptcha.render(containerRef.current, { sitekey: RECAPTCHA_SITE_KEY });
    }

    if (window.grecaptcha) {
      renderWidget();
      return;
    }

    window.__onRecaptchaLoad = renderWidget;

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  return <div ref={containerRef} />;
}
