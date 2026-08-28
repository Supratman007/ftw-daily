"use client";

import { useState } from "react";

/** Copies the referral link to the clipboard and flashes a "Copied!"
 * confirmation for a second -- small polish so an agent sharing the
 * link on their phone doesn't have to select/copy the text by hand. */
export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (older browsers, non-HTTPS
      // preview) -- the link is still selectable text, so fail quietly.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-sand-deep bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-sand"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
