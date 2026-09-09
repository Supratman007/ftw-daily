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
  request: {
    heading: "Request to book",
    summary: (date: string, pax: number, estimate: string) =>
      `${date} · ${pax} traveler${pax === 1 ? "" : "s"} · Est. ${estimate} before any park insurance you add below`,
    travelerLegend: (n: number) => `Traveler ${n}`,
    fullNameLabel: "Full name (as on passport)",
    passportLabel: "Passport photo/scan",
    passportHint: "JPG, PNG, or PDF, up to 5MB.",
    insuranceLabel: "Insurance",
    selfInsuranceLabel: "I have my own travel insurance",
    policyNumberPlaceholder: "Policy number",
    insuranceCompanyPlaceholder: "Insurance company",
    parkInsuranceLabel: (fee: string) => `Use park insurance (${fee}/person, added to your total)`,
    hotelNameLabel: "Hotel name (optional)",
    roomNumberLabel: "Room number (optional)",
    submit: "Submit request",
    notice:
      "This is a request, not a payment -- we'll email you a payment link only once we've confirmed park permit availability.",
  },
  confirmation: {
    wrongAccountTitle: "Wrong account",
    wrongAccountHeading: (email: string) => `This booking isn't linked to ${email}`,
    wrongAccountBody: (email: string) =>
      `You're currently signed in as ${email}, but this booking was made under a different account. Log out and sign back in with the email you used when booking.`,
    logout: "Log out",
    confirmingHeading: "Confirming your payment…",
    confirmingBody: "This usually takes just a few seconds. This page will update on its own -- no need to refresh.",
    failedHeading: "Payment didn't go through",
    failedBody: "This booking wasn't completed, so nothing was charged. You can try again from the trip page.",
    backToTrip: "Back to trip",
    confirmedLabel: "Booking confirmed",
    bookingCodeLabel: "Booking code",
    dateLabel: "Date",
    travelersLabel: "Travelers",
    pickupLabel: "Pickup",
    dropoffLabel: "Drop-off",
    passengerLabel: "Passenger",
    flightLabel: "Flight",
    driverWhatsappLabel: "Driver will WhatsApp",
    discountLabel: (code: string) => `Discount (${code})`,
    totalPaidLabel: "Total paid",
    emailNotice: "A confirmation email is on its way to you. See you on the trip!",
    browseMore: "Browse more trips",
  },
  login: {
    createAccountHeading: "Create your account",
    welcomeBackHeading: "Welcome back",
    createAccountSubtitle: "Takes less than a minute.",
    loginSubtitle: "Log in to continue.",
    matchEmailNotice: "Use this same email address so we can match it to what you already told us.",
    fullNamePlaceholder: "Full name",
    phonePlaceholder: "Phone",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    createAccountButton: "Create account",
    loginButton: "Log in",
    forgotPassword: "Forgot password?",
    haveAccountPrompt: "Already have an account? ",
    newHerePrompt: "New here? ",
    loginLink: "Log in",
    signupLink: "Create an account",
  },
  gift: {
    heading: "Give this trip as a gift",
    intro:
      "Pay now, and we'll send you a voucher code to pass along. The recipient picks their own date later -- no rush, no date to lock in today.",
    recipientNameLabel: "Recipient's name",
    recipientNamePlaceholder: "Who's this for?",
    recipientContactLabel: "Recipient's email or phone",
    recipientContactPlaceholder: "How we'd reach them if needed -- we won't contact them unprompted",
    travelersLabel: "Number of travelers",
    discountCodeLabel: "Discount code (optional)",
    discountCodePlaceholder: "e.g. WELCOME10",
    totalLabel: "Total",
    continueToPayment: "Continue to payment",
  },
  redeem: {
    heading: "Redeem a gift voucher",
    intro: "Enter the voucher code from your email to get started.",
    codeLabel: "Voucher code",
    codePlaceholder: "e.g. GIFT-CQPEBR",
    lookupButton: "Look up voucher",
    notFoundHeading: "Voucher not found",
    notFoundBody: (code: string) =>
      `We couldn't find a voucher with code "${code}". Double-check it against your email, or email us at`,
    notFoundBodyEnd: "and we'll help.",
    voucherHeading: "Gift voucher",
    tripLabel: "Trip",
    forLabel: "For",
    valueLabel: "Value",
    expiresLabel: "Expires",
    requestSentHeading: "Request sent!",
    requestSentBody:
      "We've received your redemption request and emailed you a confirmation. We'll be in touch shortly to confirm your date.",
    alreadyRedeemedHeading: "Already redeemed",
    alreadyRedeemedBody: "This voucher has already been redeemed. If that's unexpected, email us at",
    expiredHeading: "This voucher has expired",
    expiredBody: "Reach out to us at",
    expiredBodyEnd: "-- we may still be able to help.",
    pendingRequestHeading: "Request already submitted",
    pendingRequestPrefix: (date: string | null, pax: number | null) => {
      let s = "We already have a redemption request on file for this voucher";
      if (date) s += ` for ${date}`;
      if (pax) s += ` (${pax} traveler${pax === 1 ? "" : "s"})`;
      return s;
    },
    pendingRequestSuffix: "-- we'll be in touch soon. Need to change something? Email",
    readyHeading: "Ready to book?",
    readyBody: "Tell us who you are and when you'd like to go -- we'll confirm your date and take it from there.",
    yourNameLabel: "Your name",
    yourEmailLabel: "Your email",
    yourPhoneLabel: "Your phone (optional)",
    preferredDateLabel: "Preferred date",
    travelersLabel: "Number of travelers",
    messageLabel: "Anything else we should know? (optional)",
    submit: "Submit request",
    questionsNotice: "Questions about this voucher?",
    backToSite: "← Back to Adventure Lombok Booking",
  },
  giftConfirmation: {
    wrongAccountTitle: "Wrong account",
    wrongAccountHeading: (email: string) => `This voucher isn't linked to ${email}`,
    wrongAccountBody: (email: string) =>
      `You're currently signed in as ${email}, but this voucher was purchased under a different account. Log out and sign back in with the email you used to buy it.`,
    logout: "Log out",
    label: "Gift voucher",
    confirmingHeading: "Confirming your payment…",
    confirmingBody: "This usually takes just a few seconds. This page will update on its own -- no need to refresh.",
    failedHeading: "Payment didn't go through",
    failedBody: "This gift voucher wasn't completed, so nothing was charged. You can try again from the trip page.",
    backToTrip: "Back to trip",
    purchasedLabel: "Gift voucher purchased",
    voucherCodeLabel: "Voucher code",
    forLabel: "For",
    expiresLabel: "Expires",
    totalPaidLabel: "Total paid",
    emailNotice: (recipientName: string) =>
      `A receipt with sharing instructions is on its way to your email. Pass the code along to ${recipientName} whenever you're ready.`,
    browseMore: "Browse more trips",
  },
};

export type Dictionary = typeof en;
