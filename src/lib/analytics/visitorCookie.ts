// A random, anonymous id -- not tied to any account or email -- that
// lets the page_views table tell "3 views, 1 visitor" apart from "3
// views, 3 visitors." Set (and read back) entirely within
// src/app/api/track/route.ts; this file just holds the shared name/age
// so nothing has to hardcode the string twice.
export const VISITOR_COOKIE_NAME = "alb_visitor";
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year, same as site_locale
