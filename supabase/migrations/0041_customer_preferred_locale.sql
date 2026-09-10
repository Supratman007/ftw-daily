-- Lets transactional emails (booking confirmed, cancellation updates,
-- gift voucher receipts, etc.) go out in whichever language a customer
-- actually browses in, instead of always English -- those emails are
-- sent from webhooks and background jobs (the Xendit webhook, the
-- daily review-request cron) that have no page request to read a
-- locale from, unlike a page render or a Server Action bound to one.
--
-- Kept updated by requireCustomer() itself (src/lib/customers/auth.ts)
-- every time it runs -- same "whichever language they're using right
-- now wins" philosophy as the site_locale cookie, just persisted
-- server-side since email sending happens outside any one request.
alter table customers
  add column if not exists preferred_locale text not null default 'en'
    check (preferred_locale in ('en', 'id'));

-- Same idea, but for a gift voucher redemption request: the recipient
-- filling out /redeem has no account yet (that's the whole "needs
-- account" step), so there's no customers row to read a locale off of
-- when staff later process their request. Set once, at request time,
-- from the same hidden locale field every other checkout-style form
-- already carries (see submitRedemptionRequestAction).
alter table gift_vouchers
  add column if not exists redeemed_locale text not null default 'en'
    check (redeemed_locale in ('en', 'id'));
