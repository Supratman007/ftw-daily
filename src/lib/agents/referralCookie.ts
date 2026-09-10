// Shared between src/proxy.ts (which sets this cookie from ?ref=CODE
// on any page) and checkout (which reads it to pre-fill the referral
// code field) -- kept separate from proxy.ts itself so pages importing
// it don't pull in that file's middleware-specific Next.js imports.
export const REFERRAL_COOKIE_NAME = "ref_agent";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
