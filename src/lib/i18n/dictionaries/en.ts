/**
 * Fixed site text (buttons, labels, headings) that Claude writes and
 * maintains directly -- confirmed directly rather than machine-
 * translated, since this is the chrome every visitor sees regardless
 * of which trip they're looking at. Trip titles/descriptions and
 * transactional emails are a separate, later phase (those need an
 * actual translation service, since there's far more of that text and
 * it changes as trips are added/edited).
 *
 * `id.ts` must match this exact shape (enforced by its `satisfies
 * Dictionary` below) -- adding a key here without adding the Indonesian
 * counterpart is a type error, not a silently-missing translation.
 */
// No `as const` -- Dictionary's string fields need to widen to `string`
// (not each literal English phrase) so id.ts's Indonesian text can
// satisfy the same type; `satisfies Dictionary` there still catches a
// missing or misspelled key.
export const en = {
  common: {
    siteName: "Adventure Lombok Booking",
    redeemVoucher: "Redeem a gift voucher",
    login: "Log in",
    myAccount: "My account",
    staffDashboard: "Staff dashboard",
    agentDashboard: "Agent dashboard",
    logout: "Log out",
    becomeAgent: "Become a Sales Agent",
  },
  home: {
    searchPlaceholder: "Search trips, activities, locations…",
    allTypes: "All types",
    allLocations: "All locations",
    searchButton: "Search",
    clear: "Clear",
    resultsFound: (count: number) => `${count} trip${count === 1 ? "" : "s"} found`,
    noProductsYet: "No trips published yet — check back soon.",
    noResults: "No trips match those filters — try clearing one and searching again.",
  },
  product: {
    perPerson: "/ person",
    manualConfirmationNotice:
      "This trip needs manual confirmation before booking -- availability depends on park permit quota we check by hand. Tell us your dates and we'll get back to you, usually within a day or two. Nothing is charged until we confirm.",
    dateLabel: "Date",
    travelersLabel: "Travelers",
    hotelNameLabel: "Hotel name (optional)",
    hotelNamePlaceholder: "Where should we pick you up?",
    roomNumberLabel: "Room number (optional)",
    discountCodeLabel: "Discount code (optional)",
    discountCodePlaceholder: "e.g. WELCOME10",
    continueToRequest: "Continue to request",
    continueToCheckout: "Continue to checkout",
    giftThisTrip: "🎁 Give this trip as a gift",
    carHirePriceLabel: "Price by car, duration & pickup area — pick your options below",
    transportPriceLabel: "Price by pickup area — pick your options below",
    reviewsHeading: "Reviews",
    reviewCount: (count: number) => `${count} review${count === 1 ? "" : "s"}`,
  },
};

export type Dictionary = typeof en;
