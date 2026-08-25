# Adventure Lombok Booking Platform — Product & Technical Spec

**Prepared for:** Adventure Lombok Tour
**Domain:** `booking.adventure-lombok.com`
**Prepared:** August 2026
**Status:** v1.0 — ready to hand to Claude Code for build

---

## 1. What we're building

A booking platform on a subdomain of adventure-lombok.com with two connected apps:

1. **Customer app** — search and book Tours, Activities, Car Hire (with driver), and Transport (airport/port transfers), pay via Xendit, view booking history.
2. **Sales Agency Portal** — hotels, restaurants, and individuals sign up as agents, get a unique agent ID + public QR code, display it, and earn tiered commission on anything booked through their code — paid out automatically to their bank account.

Both apps share one product catalog synced from your existing WordPress site, one inventory/availability engine, and one payments backend.

---

## 2. Users & what each one needs

| User | Needs |
|---|---|
| **Traveler (customer)** | Find a tour/activity/car/transfer, see real availability, pay securely, get confirmation, see past bookings |
| **Sales Agent** (hotel front desk, restaurant, freelancer) | Sign up, get approved, get their QR code + ID, see what sold through their code, see commission owed/paid |
| **You (Admin/Ops)** | Manage catalog sync, approve agents, set commission tiers, see all bookings, handle refunds/cancellations, trigger/monitor payouts |
| **Guide/Driver (future)** | See assigned bookings for the day (Phase 3, not in this spec's build scope) |

---

## 3. Core user flow (as you specified)

```
Sign-up/Login → Smart Search & Filters → Listing Details → Secure Checkout → Booking History
```

Agents get a parallel entry point:

```
Public QR scan → Product page (pre-tagged with agent ID) → same checkout flow → booking attributed to agent
```

---

## 4. Information architecture

```
booking.adventure-lombok.com/
├── /                          Home — search + featured products, no login required
├── /login                     Sign up / log in (same toggled screen, §6i) — reached proactively via header, or inline before checkout
├── /search?type=tour&date=…   Search & filters
├── /p/[slug]                  Product listing detail (?agent=AGT-XXXX for attribution)
├── /checkout/[bookingId]      Secure checkout (Xendit) — instant-book products only
├── /request/[bookingId]       Booking request form (Rinjani-style: docs, insurance) — request_confirmation products
├── /confirmation/[bookingId]  Booking confirmation
├── /account                   Customer: profile, booking history
├── /account/booking/[id]      Customer: booking detail + in-app chat with your team
├── /agent/signup              Agent application form
├── /agent/dashboard           Agent: overview, QR/ID card, catalog, sales report, payouts
├── /admin                     Internal ops dashboard (staff only)
├── /admin/requests            Internal: Rinjani-style booking request queue (confirm/decline)
├── /admin/inbox                Internal: unified chat inbox (customer + agent threads, §6c)
├── /admin/agent-verification    Internal: agent NIB/PIC/ID verification queue (§6m)
├── /admin/moderation            Internal: held reviews (3 stars or below) awaiting approval (§6d)
├── /admin/cancellations         Internal: cancellation/reschedule/force-majeure request queue (§6f)
├── /review/[token]              Public, no login: one-time review form from the request email (§6d)
```

---

## 5. Product catalog & sync from adventure-lombok.com

Your site is **WordPress**, running the **Traveler** theme with custom post types: `st_tour`, `st_activity`, and taxonomies for location and tour type. It already has a **"Partner User"** account type — worth reusing conceptually for agent identity if you want single sign-on later.

**Recommended sync approach (not scraping):**

1. Install a small companion plugin on adventure-lombok.com (or use **WPGraphQL** / **WP REST API** with custom post types exposed) that publishes: title, slug, description, price, currency, duration, images, location, category, and per-date inventory/capacity to a REST endpoint. **Confirmed:** your current theme already tracks per-date capacity, so Phase 1 can enforce real, hard availability limits from day one — no manual buffer needed while this gets built.
2. The booking app pulls this on a schedule (every 15–30 min) via a sync job, **or** WordPress pushes a webhook on publish/update for instant sync.
3. Store a normalized copy in the booking app's own database — the booking app should **never** query WordPress live on each page load (too slow, single point of failure).
4. **Car Hire and Transport are both exceptions to this section.** Neither syncs from WordPress. Car Hire pricing is manually entered per §6a. Transport (airport/port transfers) pricing is also entered manually, directly in the booking app's admin, once that admin screen is built — there's no WordPress source for it to sync from, so this isn't a "sync vs. manual" decision, it's manual by default.

This sync layer is the first thing to build and test — everything else depends on it.

---

## 6a. Car Hire — pricing model (manually entered, not synced)

Car Hire doesn't fit the "one product, one price" shape the other three product types use. Price depends on **which car**, **how many hours**, and **whether the trip runs over**. This needs its own small pricing engine and its own admin screens.

**How it works, based on what you described:**

- You maintain a list of **car types**, each with a **seat capacity** and its own pricing. **Capped at 4-seater and 6-seater only** — Indonesian government policy requires a licensed tour guide (not just a driver) for vehicles seating 10 or above, and you don't want to build that requirement into a self-service car hire flow, so 10-seaters are out of scope for this product entirely. If you want to offer larger-vehicle transport later, that's a guided-tour product with a guide included, not a Car Hire booking — worth treating as a separate product type rather than stretching Car Hire to cover it.
- Customers choose by **capacity tier** first ("4-seater" or "6-seater"), and see the actual **car model/name** within that tier (e.g. "6-seater — Toyota Innova").
- Each car type has a set of **fixed duration packages**: **6 hours, 8 hours, 10 hours** — each with its own price, not a simple hourly multiplier, since longer packages are usually discounted.
- **Price also varies by starting area** — a 6-hour Innova from Senggigi isn't necessarily the same price as a 6-hour Innova from the airport, since distance/positioning cost differs. So price is really a **grid**: car type × duration × starting area, entered manually by you, not calculated. The starting area is the same field as the meeting point picker in §6e — there's no separate "pricing zone" concept for the customer to think about, it's one selection that does double duty.
- **The product page shows a price by default for the Senggigi area** (your default operating base) before the customer touches anything, and the price updates live the moment they change the starting area/meeting point dropdown. If they pick "Other — enter your address" (a location not on your fixed list), there's no exact rate to show — the UI should say the price is confirmed by your team rather than silently guessing, since showing a wrong number is worse than asking the customer to wait for confirmation.
- **Extra hours are settled directly with the driver, in cash — not through the app.** If the trip runs past the package's hours, the customer pays the driver on the spot at a **fixed rate you set per car type**, shown to the customer **before they book**, so there's no surprise and nothing for the app to bill or reconcile afterward. This considerably simplifies the payment side: Car Hire's online payment is only ever the fixed package price, full stop.
- Pickup time and meeting point are captured at booking time — see §6e, which covers this for both Car Hire and Transport together since the requirements are identical.

**Data model additions:**

```
CarType
 ├─ id, name (e.g. "Toyota Innova"), capacity_tier (4 | 6 seats)
 ├─ image, features[] (AC, driver included, etc.)
 └─ status (active | inactive)

CarPackage
 ├─ id, car_type_id, duration_hours (6, 8, or 10)
 └─ overtime_rate_per_hour (IDR — disclosed to customer, paid in cash to driver, not charged by the app)

CarPackagePrice
 ├─ id, car_package_id, meeting_point_id (references MeetingPoint, §6e)
 └─ price (IDR) — one row per (car type × duration × starting area) combination, manually entered
```

**Checkout behavior:** the customer pays only the fixed package price (for their chosen starting area) at booking time (same Xendit flow as everything else). No online overage billing exists for this product — it's out of scope by design, not deferred to a later phase.

**Admin screens needed (Phase 3):** add/edit car types, add/edit duration packages, and — this is the part that needs to be genuinely easy to use, since it's the screen you'll touch most — a **price grid editor**: rows are car type × duration, columns are meeting points/starting areas, cells are the price. Not a form you fill in one at a time per combination; a spreadsheet-like table you can scan and edit directly, since you'll have roughly 2 car types × 3 durations × however many meeting points you define, and that's tedious to manage as separate forms.

---

## 6b. Manual-confirmation booking flow (Mount Rinjani Trek, and any future product like it)

Rinjani doesn't fit the "instant book + pay" pattern the rest of the catalog uses. Availability depends on the national park's entrance ticket quota, which you have to check yourself before a booking can be confirmed — so payment has to come **after** confirmation, not before.

**The flow:**

```
Customer selects date + pax
        ↓
Submits a booking REQUEST (no payment yet) + uploads passport copy(ies)
+ declares insurance: "I have my own" (number + company) OR "Use park insurance (Rp 290,000/person)"
        ↓
Request lands in your admin queue, status: Awaiting review
        ↓
You manually check Rinjani National Park (TNGR) entrance ticket availability
        ↓
   ┌─────────────┴─────────────┐
   ↓                            ↓
Available → Confirm            Unavailable → Decline / suggest alternate date
   ↓                            (customer notified either way, in-app + email)
Customer gets a payment link, 24-hour countdown starts
   ↓
   ┌─────────────┴─────────────┐
   ↓                            ↓
Paid within 24h → Confirmed    Not paid in 24h → slot auto-released,
                                 status: Expired, customer notified
```

**Product-level flag:** every product now has a `booking_mode`: `instant` (Tours, Activities, Transport, Car Hire — pay at checkout, as already specced) or `request_confirmation` (Rinjani Trek, and anything else you flag this way later). The customer-facing listing page and checkout logic branch on this flag — the UI for a `request_confirmation` product shows "Request to book" instead of "Book now," and skips straight to Xendit only after you confirm.

**Booking status states (expanded from §6):**

```
submitted → under_review → confirmed_awaiting_payment → paid_confirmed
                ↓                       ↓
            declined                 expired (auto, after 24h)
```

**Data model additions:**

```
BookingRequest (extends Booking, for request_confirmation products)
 ├─ park_ticket_status: pending_check | available | unavailable
 ├─ confirmation_deadline (set when you confirm — now() + 24h)
 ├─ admin_notes (internal only, not visible to customer)
 └─ decline_reason (visible to customer, if declined)

Traveler (one per pax on the booking — Rinjani requires per-person documents)
 ├─ booking_id, full_name
 ├─ passport_scan_url (private storage, signed URL access)
 ├─ insurance_type: self_provided | park_provided
 ├─ insurance_number, insurance_company (if self_provided)
 └─ insurance_fee (290,000 IDR × pax, auto-added to total if park_provided)

Message
 ├─ booking_id, sender (customer | staff), body, created_at
 └─ read_at (nullable)
```

**Passport handling:** uploaded as a photo/scan directly in the app, stored in a **private** storage bucket (not publicly accessible by URL guessing), visible only to your ops team and the customer who uploaded it. This is sensitive personal data — flagged again in §13 (non-functional requirements) as something your privacy policy needs to explicitly cover, and access to it should be logged (who viewed which passport, when) in case that's ever needed for a dispute.

**In-app chat:** a simple per-booking message thread, visible on both the customer's booking detail page and your admin dashboard — not a general inbox, tied specifically to a booking so context (which trip, which dates, which documents) is always attached. Real-time updates (message appears without refreshing) are straightforward to add on the Supabase stack already recommended in §10, since Supabase includes this natively. **WhatsApp is not integrated for v1** — the app simply shows your WhatsApp number as a fallback contact method on the booking page, for customers who'd rather message you there directly; nothing about that conversation flows back into the app.

**24-hour expiry job:** a scheduled job (same Vercel Cron mechanism used for the WordPress sync in §5) checks every few minutes for `confirmed_awaiting_payment` bookings past their `confirmation_deadline`, marks them `expired`, releases the implied slot, and notifies the customer. This is a small but important piece of logic — untested expiry handling is how you'd end up either double-holding a park quota slot indefinitely or auto-cancelling someone who paid seconds too late, so it deserves explicit test cases before launch.

**Commission note:** agent attribution still works exactly as in §7 — the agent's code is tagged at the moment of the initial request, not at final payment, so an agent gets credit for the request even if confirmation takes a few days.

---

## 6c. Agent support chat — "ask about a product"

Agents will know your catalog reasonably well from the agent dashboard's catalog view (§6, product cards with commission shown), but they'll still hit questions your dashboard can't answer on its own — a customer asking something specific, a date that looks unavailable, how a commission was calculated. Rather than routing that to WhatsApp (which fragments the conversation away from the app and away from any record you can search later), this needs the same kind of in-app thread the customer flow already has in §6b — just scoped to the agent instead of a booking.

**This means the chat system in §6b should be generalized now, rather than built twice:**

```
Conversation
 ├─ id, kind (customer_booking | agent_support)
 ├─ booking_id (set when kind = customer_booking)
 ├─ agent_id (set when kind = agent_support)
 ├─ related_product_id (nullable — set when an agent starts a thread from a specific product card)
 ├─ status (open | resolved)
 └─ created_at

Message
 ├─ conversation_id, sender (customer | agent | staff), body, created_at
 └─ read_at (nullable)
```

(This replaces the `Message.booking_id` field described in §6b — the booking-scoped chat there is just `Conversation.kind = customer_booking`.)

**Where this shows up for the agent:**
- A **"Support"** tab in the agent dashboard, alongside Overview / Catalog / Sales report / Payouts — a running thread with your team, not a per-booking thread, since most agent questions aren't tied to one specific sale.
- A small **"Ask about this"** action on each product card in the agent's catalog view — tapping it opens the Support tab with the product already tagged as context (`related_product_id`), so when your team answers, they can see at a glance which product the question was about without the agent having to explain it again.
- Same real-time delivery as the customer-facing chat (Supabase Realtime, per §6b) — an agent standing at a hotel desk with a customer in front of them needs an answer in minutes, not after a page refresh.

**Where this shows up for you (admin):** one **unified inbox** (`/admin/inbox`) listing all open conversations — both customer booking threads and agent support threads — sorted by most recently active, with a badge distinguishing the two kinds. This avoids building two separate inboxes for what is structurally the same feature, and means nothing falls through the cracks because it landed in a channel you weren't checking.

**Not in scope for v1:** a searchable knowledge base or FAQ agents self-serve from before messaging you. The product catalog view with commission rates already covers the basics; if the same questions come up repeatedly once agents are live, that's a good, evidence-based signal for what a v2 FAQ should actually contain — better to let real questions define it than to guess upfront.

---

## 6d. Reviews & automated review-request email

Every product needs reviews, sourced only from customers who actually completed a paid booking for it — this keeps reviews genuine and gives you a real trust signal to show on each product page, the same way Tripadvisor ratings work for your existing site.

**Eligibility & one-review-per-booking:**
- A review can only be submitted against a `Booking` with status `paid_confirmed` (or `completed`) — never a pending or cancelled one.
- One review per booking, not per customer — someone who books the same tour twice can review it twice, once per trip.

**Trigger — same day the trip/service ends:**
- Every `Booking` gets a computed `service_end_date` at the time it's confirmed (`slot_date` + product duration — for a 3-day Rinjani trek that's start date + 2 days, for a single-day tour it's just the booking date).
- A scheduled job (the same Vercel Cron pattern already used for the WordPress sync in §5, the Rinjani expiry check in §6b, and the payout run in §8) runs once daily, finds every booking whose `service_end_date` is today, and immediately sends the review-request email — no delay.

**The email itself:**
- Sent via the transactional email provider already in the stack (§10 — Resend).
- Subject along the lines of "How was your [product title]?" — personalized with the actual product name, not generic.
- One clear button: **"Write your review"** — nothing else competing for the click.
- The button is a **one-time secure link** (`/review/[token]`) that opens the review form pre-filled with the correct product and booking, **without requiring login** — the token itself proves eligibility. This maximizes completion rate, which was the explicit goal.
- The token is a single-use, unguessable value, generated only for that booking, and should expire after a reasonable window (recommend 30 days) so an old email can't be used to spam a review months later.

**Moderation — rating-based:**
- **4 or 5 stars**: publishes to the product page immediately, no admin step.
- **3 stars or below**: held as `pending_moderation` and routed to an admin review queue (`/admin/moderation`) — you approve, edit, or reject before it goes public. This protects against a single bad-mood review appearing unmoderated while still keeping the common case (happy customers) frictionless.

**Data model additions:**

```
Booking (add field)
 └─ service_end_date (computed at confirmation time)

Review
 ├─ id, product_id, booking_id, customer_id
 ├─ rating (1-5), title, body
 ├─ status: published | pending_moderation | rejected
 ├─ review_token, token_expires_at, token_used_at
 └─ created_at, published_at
```

**Product page:** shows the average rating and review count (already part of the product card design from §4), plus the list of published reviews beneath the product description. Only `published` reviews are ever shown publicly — held or rejected ones never appear, including to the reviewer themselves (they should just see "thanks, your review is being reviewed" rather than a visible-but-unpublished state that could look like a bug).

**Why this fits the phasing:** this depends on the same scheduled-job and transactional-email infrastructure already being built in Phase 3 for payouts and the Rinjani expiry check, so it belongs in that phase rather than earlier — building it in Phase 1 would mean building the cron/email plumbing twice.

---

## 6e. Pickup time & meeting point (Car Hire and Transport) — and Transport's zone pricing

Both products need to know **when** and **where** to pick the customer up — this is shared logic, not built twice.

**Meeting point — best of both, not one or the other:** you asked me to make this call. A pure free-text field means customers mistype or under-specify an address your driver can't find; a pure fixed dropdown can't cover every hotel or villa on the island. So the picker offers **both**: a short list of common, admin-managed meeting points (e.g. Senggigi, Kuta Lombok, Gili Bangsal Harbour, Lombok International Airport, Mataram City) for the common cases, plus an **"Other — enter your address"** option with a free-text field for anything not on the list. This keeps the common path fast while never blocking an edge case.

```
MeetingPoint (admin-managed list — also the pricing key for §6a and this section)
 ├─ id, name (e.g. "Senggigi"), region
 └─ status (active | inactive)
```

**Transport pricing is also by starting area, same mechanism as Car Hire:** rather than one flat price, each Transport product has a price per meeting point/starting area, manually entered by you. The listing page defaults to showing the **Senggigi** price before the customer picks anything (your default base), and updates live when they change the starting area — this is the same dropdown that sets the meeting point, doing double duty as the pricing input. As with Car Hire, an "Other" custom address has no listed rate, so the page should say the price is confirmed by your team rather than guess.

```
TransportPrice
 ├─ id, product_id, meeting_point_id
 └─ price (IDR) — one row per (transport product × starting area), manually entered
```

**Pickup time:** captured as part of the booking (date + time), shown clearly on the confirmation and in booking history.

**Customers can revise their pickup time after booking** — a self-service edit on their booking detail page, not something that requires contacting you. Recommend a cutoff (e.g. changes allowed up to 3 hours before the scheduled pickup, editable as an admin setting) so a last-minute change doesn't strand a driver already en route; you should confirm what cutoff makes sense operationally before this ships, since I'm proposing a sensible default here rather than something you've specified.

**Data model additions (shared by CarBooking and Transport bookings):**

```
Booking (add fields, for car_hire and transport types)
 ├─ car_type_id, car_package_id (car_hire only)
 ├─ pickup_datetime
 ├─ meeting_point_id (nullable — set if chosen from the list; also the pricing key for §6a/§6e)
 ├─ meeting_point_custom (nullable — free text, set if "Other" was chosen; no fixed price applies)
 └─ pickup_change_log[]: { old_datetime, new_datetime, changed_at } — an audit trail, since a driver dispatch depends on this being accurate and disputes ("I never changed it") should be resolvable
```

---

## 6f. Cancellation, rescheduling & force majeure policy

This needs to be a real rule engine the app enforces consistently, not a case-by-case judgment call each time — both so customers get predictable answers and so you're not manually recalculating percentages under time pressure.

**Standard cancellation fee schedule** (applies to customer-initiated cancellations, not force majeure — see below):

| Timing | Refund | Fee (bank/payment gateway admin charge) |
|---|---|---|
| No-show, or cancelled on the day of departure | 0% refund | 100% |
| Cancelled 1 day before departure | 65% refund | 35% |
| Cancelled 2+ days before departure | 90% refund | 10% |

This should be stored as **admin-editable config**, not hardcoded, so you can adjust the percentages later without needing a developer:

```
CancellationPolicyTier
 ├─ id, min_days_before_departure, refund_pct
 └─ (no_show / same-day is the implicit 0% floor)
```

**The process is semi-automated, matching what you described:** the customer requests a cancellation in the app, the app **calculates** the refund amount instantly using the table above based on days-until-departure, but a staff member **manually reviews and confirms** before the refund is actually issued via Xendit — this catches edge cases (a customer disputing the date, a duplicate request) before money moves, while removing the burden of manually doing the percentage math every time.

**Force majeure (illness, etc.) is a separate path, not a discount tier:** these bypass the fee schedule entirely and always require manual review (e.g. supporting documentation like a medical note, uploaded the same way as the Rinjani passport upload in §6b). Once approved, the customer gets **either**:
- **Reschedule** the same product to a new date (subject to availability), at no fee, or
- **Convert the booking into a gift voucher** — transferable to a relative or friend, redeemable for the same product at the same value, under the same terms as the original booking (i.e. the voucher itself is still subject to this same cancellation policy if the recipient later needs to cancel).

**Data model additions:**

```
CancellationRequest
 ├─ id, booking_id, requested_at, requested_by
 ├─ path: standard | force_majeure
 ├─ evidence_url (nullable — e.g. medical note, for force_majeure)
 ├─ calculated_refund_pct, calculated_refund_amount (auto, from the table above — standard path only)
 ├─ resolution: refund | reschedule | gift_voucher | rejected
 ├─ status: pending_review | approved | rejected
 └─ reviewed_by, reviewed_at, admin_notes

GiftVoucher
 ├─ id, original_booking_id, product_id, value_amount
 ├─ recipient_name, recipient_contact
 ├─ redemption_code
 ├─ status: issued | redeemed | expired
 └─ issued_at, expires_at (recommend setting an expiry — e.g. 12 months — so vouchers don't sit as an open-ended liability indefinitely)
```

**Admin screen needed (Phase 3):** a cancellation/refund request queue (`/admin/cancellations`), parallel in spirit to the Rinjani request queue in §6b and the review moderation queue in §6d — same pattern of "customer-initiated request → staff reviews → app executes the outcome," reused a third time here.

---

## 6g. Notifications — customer, agent & admin alerts

An audit of the spec as it stood turned up a real gap worth naming directly: **customer-facing booking confirmation, cancellation, and reschedule emails were never formally specified.** §10's stack table mentioned "booking confirmations, payout notices" as an example use of the email provider, but nothing defined what those actually contain or when they fire — which is a more basic gap than the agent/admin notifications below, since it's the single most-sent email the whole platform will produce. Fixing all three audiences together here, since they share the same infrastructure.

**Customer notifications (email, via Resend):**

| Event | Trigger | What the email shows |
|---|---|---|
| **Booking confirmed** | A `Booking` reaches `paid_confirmed` (instant-book: Tours, Activities, Car Hire, Transport) or a Rinjani request (§6b) is paid | Product name, date, pax/travelers, total paid, booking reference code, pickup time + meeting point (Car Hire/Transport only) |
| **Booking cancelled** | A `CancellationRequest` (§6f) is approved via the standard path | Product name, date, refund percentage and amount per the fee schedule, and a note that Xendit refunds typically take a few business days to appear |
| **Booking rescheduled** | A force-majeure reschedule (§6f) changes a booking's date | Product name, old date → new date |
| **Gift voucher issued** | A force-majeure gift voucher (§6f) is issued | Two separate emails: one to the original booker confirming the voucher was created, and a second to the named recipient with their redemption code and how to use it — the recipient has no account yet, so this one is necessarily a no-login link, same reasoning as the review-request magic link in §6d |
| **Pickup time changed** | Customer self-service pickup-time edit (§6e) | Old time → new time, as a record for both the customer and the driver, since dispatch depends on this being accurate |

Rinjani's decline/expiry notifications already described in §6b fold into this same table and infrastructure — they were speced narratively there; this is where they're formally accounted for alongside everything else.

**Login requirement, and the one deliberate exception:** by the time any of these fire, the customer already has an account (per the core flow: Sign-up/Login → Search → Listing → Checkout → Booking History), so the CTA in these emails requires login, landing on `/account/booking/[id]` after — same reasoning as the agent notifications below, not the review-request pattern. The **gift voucher recipient** email is the deliberate exception: that person doesn't have an account (they're receiving someone else's booking as a gift), so it has to be a no-login redemption link, the same category of exception as the review-request email in §6d.

**Agent booking notifications:**

| Event | Trigger | What the email shows |
|---|---|---|
| **New booking** | A `Booking` reaches `paid_confirmed` (instant-book products) or the Rinjani request in §6b gets paid, and `agent_id` is set | Product name, date, pax, commission earned on this booking, current running total for the month |
| **Booking cancelled / didn't go through** | A booking with `agent_id` set ends without completing — a standard cancellation is approved (§6f), a Rinjani request is declined (§6b), or a Rinjani hold expires unpaid (§6b) | Product name, date, and which of the three reasons applies (worded differently for each — "the customer cancelled," "we couldn't confirm park tickets," "the payment window expired" — since these mean different things to an agent even though the commission outcome is the same: it's removed from their pending total) |
| **Booking rescheduled** | A force-majeure reschedule (§6f) changes a booking's date, and `agent_id` is set | Product name, old date → new date |

Same login requirement as customer notifications above — an agent's email button links to the specific booking inside `/agent/dashboard`, requiring login rather than bypassing it, since this is an ongoing business relationship with a dashboard they log into repeatedly, not a one-time transaction.

**Admin review notification (email):** mirrors the GetYourGuide format directly — subject line naming the product ("New review on Mount Rinjani Trek — Summit"), the review text and star rating shown inline in the email itself (not just "you have a new review, click to see it"), and one button. Two versions depending on the moderation outcome from §6d:
- **4–5 stars (auto-published):** button reads "View review" → the product's live review section.
- **3 stars or below (held):** the email makes clear this one needs a decision — button reads "Review & moderate" → `/admin/moderation`, the specific held review. This is the version that actually needs to interrupt you; the 4–5 star case is more of a courtesy heads-up.

Sent to whichever email address(es) you designate as admin/ops recipients (configurable, not hardcoded to one inbox, in case more than one person ends up handling this).

**Not building yet, but worth flagging since GetYourGuide's email has it:** a public "reply to review" feature, where your reply appears alongside the review for future customers to see. That's a genuinely nice trust-building feature, but it's a new capability beyond what's already specced (the review model in §6d doesn't currently have a place for a business reply), so it's a clean v2 addition rather than something to fold into this notification work now.

**Data model addition (shared idempotency, since these are all event-driven off webhooks and cron jobs, which can retry and duplicate-fire):**

```
NotificationLog
 ├─ id, type (
 │    customer_booking_confirmed | customer_booking_cancelled | customer_booking_rescheduled |
 │    customer_gift_voucher_issued | customer_pickup_time_changed |
 │    agent_new_booking | agent_booking_cancelled | agent_booking_rescheduled |
 │    admin_new_review
 │  )
 ├─ related_id (booking_id, voucher_id, or review_id)
 └─ sent_at
```
Before sending any of these, check whether a log entry already exists for that `(type, related_id)` pair — this is a small addition but prevents, say, a customer getting the same "booking confirmed" email three times because a webhook retried.

**Phasing:** the customer **booking confirmed** email is core to Phase 1 — it's the most basic transactional email the platform sends and should ship with the very first instant-book flow, not be treated as a later add-on. The agent "new booking" notification only depends on agent attribution (already Phase 2), so it ships then. Everything else here — customer cancellation/reschedule/gift-voucher emails, agent cancellation/reschedule notifications, and the admin review notification — depends on §6f's or §6d's Phase 3 infrastructure, so those ship together in Phase 3 rather than earlier.

---

## 6h. Customer account dashboard

The IA in §4 has listed `/account` and `/account/booking/[id]` since early in this spec, but nothing has actually defined what lives there — booking history alone was standing in for the whole account section, which isn't the same thing. A real account area has four parts:

**Overview:** a landing view when the customer logs in — their next upcoming trip surfaced prominently (if they have one), with quick links into the other three sections below. Not meant to be analyzed, just oriented — "what's coming up, where do I go for more."

**My Bookings:** the list view already specced (upcoming/completed cards) — but this alone was standing in for `/account/booking/[id]`, a route this spec has named since §4 without ever actually designing it. Same gap as the account dashboard itself: a route named in the IA isn't the same as a page that's been thought through. Fixed properly here.

**The list view stays lean.** Each row shows just the title, booking code, date, and status — plus one link: **"View details."** Stacking five or six action links into a compact list row (confirmation email, cancel, reschedule, gift, pickup time) would hurt scannability, which runs directly against the "easy to use, solves the problem" principle this whole app is being built on. Everything else lives one level in.

**The booking detail page (`/account/booking/[id]`) shows:**
- **Trip info** — product, date, booking code, and for Car Hire/Transport, pickup time + meeting point. The self-service pickup-time change from §6e stays exactly where it already works well — inline on the list row itself, not moved here; the detail page just displays it as part of the full picture.
- **Participants** — the lead traveler (the account holder) plus a total headcount always; **individual participant names** are shown when they exist. They always exist for Rinjani (the `Traveler` records already required for passport/insurance, §6b). For the other three product types, individual names weren't previously collected at all — just a pax count. Worth adding a genuinely optional "add traveler names" step at checkout for any booking with more than one person, skippable with no penalty, so there's something meaningful to show here without forcing friction on someone who just wants two seats on a snorkeling trip and doesn't care to type names.
- **Contact info** — email and phone, pulled from the `Customer` profile (§6h Profile), not re-entered per booking.
- **Actions, status-dependent:**
  - *Upcoming:* view confirmation email (§6g), message us about this trip (opens the specific `Conversation` — the detail page is the *other* entry point into per-booking chat, complementing the unified Messages list above, not replacing it), **request reschedule**, **send as gift**, cancel booking.
  - *Completed:* write a review (§6d) if not already done, view the review-request email (§6g), message us about this trip.

**Reschedule and gift are entry points into §6f's existing force-majeure flow, not a new capability.** Per the cancellation policy already specced, free rescheduling and gift-voucher conversion are force-majeure outcomes (illness, etc.) — bypassing the standard fee schedule is the whole reason they require a stated reason and admin review, so these two links open that request flow (reason, optional supporting evidence, then either a new-date picker or a gift recipient's name and contact) rather than an unrestricted self-service date change. A customer who just wants to move their booking for convenience, with no force-majeure circumstance, should use standard cancellation and rebook — offering unrestricted free rescheduling would quietly undermine the fee schedule §6f was built to enforce.

**Messages:** every `Conversation` of kind `customer_booking` (§6b, §6c) the customer is part of, in one place — not just reachable by drilling into a specific booking. Someone with two concurrent bookings (say, a Rinjani trek and a car hire) shouldn't have to remember which booking a given conversation was attached to; a unified message list, mirroring the unified admin inbox in §6c, solves that on the customer side too. (The booking detail page above is the complementary entry point — both lead to the same underlying thread.)

**Profile:** name, email, phone, and language preference (English/Indonesian, per §12's Phase 3 i18n work). Also where **saved trekking documents** live — if a customer uploaded a passport scan and insurance details for a Rinjani booking (§6b), offering to reuse them on a future Rinjani booking (with the customer's explicit consent, and an easy way to remove them) saves genuinely tedious re-entry. This needs the same private-storage handling already specced for the original upload in §6b — saving it for reuse doesn't loosen who can access it.

**Data model note:** mostly a presentational surface over `Booking`, `Conversation`, `Review`, and `Traveler`, which already exist. Additions:

```
Customer (add fields)
 ├─ saved_passport_url (nullable, private storage — reused only with explicit consent at time of next Rinjani booking)
 ├─ saved_insurance_number, saved_insurance_company (nullable)
 └─ language_preference (en | id)

Booking (add field)
 └─ participant_names[] (nullable — optional, collected at checkout only if pax > 1 and the customer chooses to add them; falls back to just a pax count on the detail page if left blank)
```

**Phasing:** Overview and the My Bookings list are core to Phase 1. The full booking detail page, including confirmation-email and pickup-time actions, is also Phase 1, since it's the natural home for features already shipping then — no reason to ship a list with nowhere for "view details" to go. Reschedule and gift, both entry points into §6f, are gated by that section's Phase 3 infrastructure. Messages depends on the chat infrastructure from §6c (Phase 2). The saved-documents part of Profile depends on Rinjani's document upload (§6b, Phase 2) — the rest of Profile (name/email/phone/language) is Phase 1.

---

## 6i. Customer sign-up & login — two entry points, and where they land afterward

The original core flow (§1) starts with "Sign-up/Login," which implied an account is required, but never specified *when* that happens or what happens right after. Here's the actual design, matching what you described:

**Browsing doesn't require an account — only checkout does.** Search, filters, and listing detail pages are fully open; forcing a login wall before someone can even look at a tour is a needless conversion killer. The account requirement kicks in at the point of actually paying, which is also the point where having an account genuinely matters (booking history, confirmation emails, self-service pickup changes — all of §6h depends on there being an account to attach a booking to).

**Two ways to end up with an account, both landing in different places afterward:**

1. **Proactive — before checkout.** A "Sign in" link is always visible in the header. Someone can create an account or log in any time, entirely independent of booking anything. Since there's no purchase in progress, completing this **redirects straight to the account dashboard (§6h) — Overview tab.** They came here to manage an account, so that's where they land.

2. **Reactive — during checkout.** If a customer with no session reaches the checkout step (§9) — either directly, or after clicking "Continue to checkout" from a listing — they hit an inline sign-up/login step **before** the payment form, not a separate page that loses their place. After completing it, they're **returned to exactly where they left off in checkout**, booking selections intact, not redirected to the dashboard. Sending someone who's mid-purchase off to a dashboard screen is how carts get abandoned; the account creation here is a means to finishing the booking, not a destination in its own right.

**The general rule underneath both:** post-authentication redirect depends on what triggered the login — a `return_to` context carried through the auth step. No `return_to` (they clicked "Sign in" cold) → dashboard Overview. `return_to = checkout` (they were mid-booking) → back to checkout, unchanged.

**Sign-up and login are the same screen, toggled** — "New here? Create an account" / "Already have an account? Log in" — rather than two separate pages, since a customer arriving via the checkout-triggered path doesn't always know in the moment which one they need.

**Auth method:** Supabase Auth (already the stack choice in §10) supports both email/password and social login (Google is the obvious first choice for international travelers) — offer both rather than picking one, since password fatigue is real and a one-tap Google option meaningfully reduces the checkout-abandonment risk this section is specifically trying to avoid.

**Signup fields:** full name, email, phone, password (or nothing beyond email if they choose Google) — matching the existing `Customer` entity in §6. No new fields needed beyond what's already specced there.

**Session persistence:** once authenticated, the session persists across visits via standard Supabase session handling — the "My account" header button in §6h just works on return visits without re-prompting, and this is also what makes the login-required CTAs in the customer, agent, and admin notification emails (§6g) function as a normal "already logged in, land straight on the page" experience rather than a repeated login wall.

---

## 6j. Password reset & change — customers and agents

Both missing from earlier drafts: a "Forgot password?" path on login, and a way to change a password once logged in. Same pattern for customers and agents, since both sit on the same Supabase Auth foundation.

**Forgot password (on the login screen):** a "Forgot password?" link next to the password field triggers Supabase's standard reset-email flow — customer/agent enters their email, gets a reset link, sets a new password. This only needs to exist on the **login** side of the toggled auth screen in §6i, not signup (there's no password to forget yet).

**Change password (inside the account):** a "Security" area in both the customer Profile (§6h) and the agent's equivalent (§6l, below) with current password / new password / confirm fields. **Conditional on how they signed up:** someone who authenticated via Google has no password to change — that section should say so plainly ("You sign in with Google — no password needed here") rather than show a form that doesn't apply to them.

No new entities — this is standard Supabase Auth functionality, not custom data modeling.

---

## 6k. Admin roles & permissions

Right now the spec treats "admin" as one undifferentiated staff bucket — every internal screen (`/admin/requests`, `/admin/moderation`, `/admin/cancellations`, `/admin/inbox`) has just said "staff only." Worth naming a real role structure, since a reservations person, an accounting person, and you shouldn't necessarily have the same access to each other's areas.

**Recommended roles:**

| Role | Access |
|---|---|
| **Super Admin** | Everything — including managing other admin accounts and their roles, agent commission tier configuration (§8), and all financial data |
| **Reservations** | Rinjani request queue (§6b), cancellation/reschedule queue (§6f), pickup-time overrides, review moderation (§6d), unified inbox (§6c) — the day-to-day operational surface, no payout or financial-report access |
| **Accounting** | Payouts and disbursement monitoring (§8), refund processing (§6f's financial side, once Reservations has approved the outcome), financial reports — not necessarily reservations access |
| **Support** *(optional, add only if you hire for it)* | Just the unified inbox (§6c) — a lower-trust role for someone answering routine chat questions without touching bookings, money, or reviews |

**Right-sized for where you are now:** you're running this solo (plus possibly one ops person), so building out enforcement for four distinct roles before you've hired for those functions would be premature. The pragmatic path: **build the `role` field into the data model from day one** (retrofitting permissions onto an existing flat admin system later is genuinely painful), but only enforce it strictly once you actually have more than one admin account — a solo Super Admin can operate under this structure without friction, and role-gating the UI becomes a small addition rather than a rebuild when you do bring someone on.

**Data model addition:**

```
AdminUser
 ├─ id, name, email
 ├─ role: super_admin | reservations | accounting | support
 └─ status: active | suspended
```

Each admin route checks the logged-in `AdminUser.role` against what that route requires — Super Admin always passes; the others are scoped to the table above.

**Phasing:** the `role` field and a single Super Admin account are enough for Phases 1–3, since that's you. Enforcing the narrower roles (Reservations/Accounting/Support) is Phase 4 — build it in once there's an actual second admin account to apply it to, rather than guessing at the boundaries now.

---

## 6l. Agent business profile

The agent dashboard has Overview (QR/ID card, stats), Catalog, Sales report, Payouts, and Support (§6c) — but nowhere for an agent to actually manage their own business details. That's a real gap: their **bank account** for Xendit disbursements (§8) has been part of the `Agent` entity since early in this spec, but no screen was ever specified for entering or updating it after initial signup.

**New "Profile" tab, agent dashboard:**
- **Business details** — business name, contact name, business type, contact email/phone (editable after the initial `/agent/signup` application).
- **Payout bank account** — the Indonesian bank account Xendit disburses commission to (§8). Changing this is worth flagging as sensitive: recommend requiring the change to be confirmed (e.g., a confirmation email to the address on file) before it takes effect, since redirecting someone else's commission payout is exactly the kind of mistake — or fraud vector — worth a speed bump for.
- **Security** — the same change-password section from §6j.

No new entities — `Agent` already has `bank_account`, `business_name`, `contact_name`, `business_type` (§7); this is a UI surface over fields that already exist in the model, plus the bank-account-change confirmation flow.

**Phasing:** Phase 2, alongside the rest of the agent dashboard build.

---

## 6m. Agent verification documents

`Agent.status` has been `pending | approved | suspended` since §7, early in this spec — but nothing has ever defined **what actually moves an agent from pending to approved.** Given this is real money changing hands monthly via Xendit disbursement, that can't just be a manual "looks fine, approve" click with nothing behind it — you need to know who you're actually paying. The required documents differ by business type, already captured in `Agent.business_type`:

**Company agents (hotel, restaurant, other):**
- **NIB** (Nomor Induk Berusaha) number — the Indonesian business registration number, entered as text
- **NIB certificate** — the actual document, uploaded (PDF or photo)
- **PIC (Person In Charge)** — name of whoever is actually responsible for this business's bookings on the platform, plus their **ID document** uploaded

**Individual agents:**
- **ID card** (KTP) — uploaded
- **ID card selfie** — a photo of the person holding their ID card next to their face, the standard liveness check confirming the ID actually belongs to whoever is signing up (not just a scan of a document that could belong to anyone)

**Where this lives:** a **Verification** section on the agent's **Profile** tab (§6l) — visible from the start of the `/agent/signup` application, and still accessible afterward for updating an expired ID or correcting a typo'd NIB number, not a one-time-only step that's invisible once submitted.

**Gating:** `Agent.status` cannot move from `pending` to `approved` — meaning the QR code and public booking link aren't live, and no commission accrues — until verification is reviewed and accepted. This is the same "customer/agent-initiated request → staff reviews → app executes" pattern already used four times elsewhere in this spec (Rinjani requests §6b, cancellations §6f, review moderation §6d, and now this) — worth building the review-queue UI pattern once and reusing it, rather than as four unrelated screens that happen to work similarly.

**Admin screen needed:** `/admin/agent-verification`, a review queue parallel to the others — approve, reject with a reason (shown back to the agent so they know what to fix and resubmit), or request additional documents.

**Storage:** all of these — NIB certificate, PIC ID, KTP, the selfie — are exactly the kind of sensitive personal/business document already covered by the private-storage handling specced for Rinjani passports (§6b) and saved customer documents (§6h): private bucket, signed-URL access, restricted to the agent themselves and admin, with access logged.

**Data model:**

```
AgentVerification
 ├─ id, agent_id
 ├─ nib_number, nib_certificate_url (company only)
 ├─ pic_name, pic_id_document_url (company only)
 ├─ id_card_url, id_card_selfie_url (individual only)
 ├─ status: pending | verified | rejected
 ├─ rejected_reason (shown to the agent)
 └─ submitted_at, reviewed_at, reviewed_by
```

**Phasing:** Phase 2, alongside the rest of agent onboarding — an agent shouldn't be able to reach an active, commission-earning state without this existing from the start. Retrofitting a verification requirement onto agents who are already live and earning would be a far worse position to be in than building it in from day one.

---

## 6. Data model (core entities)

```
Product
 ├─ id, type (tour | activity | car_hire | transport), title, slug, description
 ├─ base_price, currency (IDR default, USD display optional)
 ├─ duration, location, images[], category
 ├─ capacity_per_date (nullable — null = unlimited)
 └─ source: wp_post_id (nullable — null for Car Hire, see §6a)

  Note: for type = car_hire, pricing does not use base_price directly —
  see CarType / CarPackage in §6a. Tour/Activity/Transport use base_price as-is.

AvailabilitySlot
 ├─ product_id, date, capacity_total, capacity_booked
 └─ status (open | soldout | blocked)

Agent
 ├─ id, agent_code (e.g. AGT-7F2K), business_name, contact_name
 ├─ business_type (hotel | restaurant | individual | other)
 ├─ status (pending | approved | suspended)
 ├─ commission_tier_id, bank_account (for Xendit disbursement)
 └─ qr_code_url, public_landing_slug

CommissionTier
 ├─ id, name (e.g. Bronze/Silver/Gold), min_monthly_bookings
 └─ commission_pct_by_product_type { tour, activity, car_hire, transport }

Booking
 ├─ id, product_id, slot_date, customer_id, agent_id (nullable)
 ├─ pax_count, addons[], subtotal, commission_amount, total
 ├─ status (pending_payment | confirmed | cancelled | completed | refunded)
 ├─ xendit_invoice_id, payment_status
 └─ created_at, source (direct | agent_qr)

Payout
 ├─ id, agent_id, period (month), total_commission, status (pending | processing | paid | failed)
 └─ xendit_disbursement_id, paid_at

Customer
 ├─ id, name, email, phone, auth_provider
```

---

## 7. Sales agency — QR & attribution logic

This is the feature that makes the whole model work, so it needs to be precise:

1. On approval, each agent gets a unique `agent_code` (short, human-readable — e.g. `AGT-BALI7`) and a QR code that encodes:
   `https://booking.adventure-lombok.com/r/AGT-BALI7`
2. Scanning the QR hits a lightweight redirect route `/r/[code]` that:
   - Sets a first-party cookie `attributed_agent=AGT-BALI7` (30-day expiry, configurable)
   - Redirects to the general catalog (or a specific product if the agent has a preferred landing product)
3. Any booking completed while that cookie is present is tagged with `agent_id` and commission is calculated at checkout using the agent's current tier.
4. **Last-touch attribution**: if a customer scans two different agents' codes, the most recent one wins. This should be stated to agents up front to avoid disputes.
5. Agents get a **printable ID card** (PDF, generated from the app) — QR code + agent name + "Official Adventure Lombok Sales Partner" — sized for a desk stand or wall frame.
6. Every agent also gets a plain shareable link (same as the QR target) for use in WhatsApp/Instagram bio, not just print.

**Overview vs. Sales report — what each shows, and why:** the agent dashboard has two places commission numbers appear, and they answer different questions on purpose:
- **Overview** is a live snapshot — this month's booking count, commission still accruing, and tier progress. It's meant to be glanced at, not analyzed.
- **Sales report** is the historical view, and needs its own totals rather than relying on Overview's snapshot: **total commission for the period shown**, **paid out to date**, and **pending payout**, sitting above the trend chart and the booking-by-booking table. This gives the agent a genuine payout estimate (paid + pending), split so they can tell what's already landed versus what's still coming — a single lump total would blur that distinction.

---

## 8. Commission & payout logic (tiered, automated)

- Tiers are defined by you in the admin panel (e.g. Bronze 8%, Silver 10%, Gold 12%), with a **different % per product type** if you want tours to pay out differently than car hire.
- An agent's tier is evaluated monthly based on trailing bookings/volume and can auto-upgrade/downgrade, or be manually pinned by admin (recommend manual override capability for VIP hotel partners regardless of volume).
- Commission accrues per booking, visible to the agent in real time ("pending" until the trip date passes and it's marked non-refundable-complete — recommend holding payout eligibility until **after** the service date, to cover cancellations).
- **Monthly automated payout**: on a fixed date (e.g. the 5th), a scheduled job totals each agent's eligible commission for the prior month and triggers a **Xendit Disbursement** to their registered bank account. Agent gets the notification email from §6g, and a downloadable statement — detailed below, since "downloadable statement" was mentioned here without ever being specced.
- **Payout statement — both formats, generated once, not on demand.** Each payout run generates two files per agent: a **PDF** (formatted statement — period, total commission, the underlying bookings that made it up, payout date, masked bank account destination; good for printing or their own records) and a **CSV** (the same line items as raw data, for an agent's own bookkeeping/spreadsheet). Both are generated **at the time of the payout run itself** and stored (Supabase Storage), not regenerated whenever someone clicks download — this matters for accounting integrity: if commission logic or a booking's status changes later, a historical statement shouldn't silently change to match. The Payouts tab in the agent dashboard (§7) gets a **"Download"** control (PDF/CSV) next to every past payout period, not just the most recent one.
- Failed disbursements (bad account details) flag for manual admin review rather than silently retrying forever.

**Data model addition:**

```
Payout (add fields)
 ├─ statement_pdf_url (private storage)
 └─ statement_csv_url (private storage)
```

---

## 9. Payments (Xendit)

- **Checkout**: Xendit Invoices API (supports cards, e-wallets like OVO/DANA/GoPay, bank transfer, QRIS) — Invoices is the fastest to implement and gives you a hosted, PCI-compliant payment page so you never touch raw card data.
- **Currency**: charge in IDR (Xendit's native strength); show USD as a reference estimate only, clearly labeled "estimated," since FX-locked USD charging adds complexity you don't need for v1.
- **Payouts to agents**: Xendit Disbursements API, IDR to Indonesian bank accounts.
- **Webhooks**: Xendit will call back on payment success/failure and disbursement status — the app needs a public webhook endpoint (with signature verification) to update booking/payout status. This is not optional; polling Xendit is unreliable.
- You already have an active Xendit account, so this is mostly configuration + API integration, not paperwork.

---

## 10. Tech stack recommendation (built for: solo, no-code-background, building with Claude Code)

| Layer | Recommendation | Why |
|---|---|---|
| Frontend + backend | **Next.js (App Router, TypeScript)** | One framework for both customer site and dashboards; Claude Code works very well with it; huge amount of reference material for it to draw on |
| Database + Auth | **Supabase** (managed Postgres + built-in auth + storage) | You don't manage servers; free tier is enough for pilot (<20 agents); Claude Code can run migrations and write queries directly against it |
| Hosting | **Vercel** | Deploys Next.js with almost no config; trivially supports a subdomain like `booking.adventure-lombok.com` via a CNAME record |
| Payments | **Xendit** (already active) | As above |
| QR generation | `qrcode` npm package (generates on the server, stored as PNG/SVG) | No third-party dependency/cost |
| Transactional email | **Resend** or equivalent | Booking confirmations, payout notices |
| Scheduled jobs (sync, payouts) | **Vercel Cron** (or Supabase Edge Functions on a schedule) | Native to the stack, no extra infra |

This whole stack can be run and paid for at low monthly cost during the pilot (roughly: Vercel free/hobby tier initially, Supabase free tier initially, Xendit is transaction-fee based, Resend free tier covers low volume). You will need to upgrade tiers as agent/booking volume grows past free-tier limits.

---

## 11. Subdomain setup

1. In your domain's DNS (wherever adventure-lombok.com is managed), add a `CNAME` record: `booking` → `cname.vercel-dns.com` (exact value provided by Vercel once the project is created).
2. Add the domain `booking.adventure-lombok.com` inside the Vercel project settings; Vercel issues the SSL certificate automatically.
3. No changes needed to your existing WordPress site or its domain — it keeps running exactly as-is; the booking app just reads from it.

---

## 12. Phased roadmap

You said you want the full system including automated tiered commissions from day one — here's how to sequence that so it's still buildable solo without everything breaking at once. Each phase should be a fully working, testable milestone before moving to the next.

**Phase 1 — Foundation**
- WordPress sync layer (pull Tours + Activities first, since those already exist as structured posts)
- Product catalog UI: search, filters, listing detail
- Customer auth (email/social login via Supabase) — open browsing with no login wall, account required only at checkout, with the two entry points and post-auth redirect logic in §6i
- Password reset (login) and change-password (Profile) for customers (§6j)
- Xendit checkout for a booking with no agent attribution yet
- Booking confirmation + booking history, including the customer "booking confirmed" email (§6g) — ships with the first instant-book flow, not deferred
- Customer account dashboard (§6h): Overview and My Bookings, plus the Profile basics (name/email/phone/language)

**Phase 2 — Agency layer + manual-confirmation bookings**
- Agent signup + admin approval flow
- Agent code + QR generation + printable ID card
- Agent verification (§6m): NIB/PIC upload for companies, ID+selfie for individuals, admin review queue — gates `Agent.status` moving to `approved`
- `/r/[code]` redirect + attribution cookie
- Agent dashboard: catalog view, live sales report, and the Profile tab (business details, payout bank account, change password — §6l)
- Commission calculation at checkout (flat rate first, tiers next)
- Rinjani-style request-to-book flow (§6b): document upload, insurance capture, admin review queue, 24h payment-window expiry job
- In-app chat, generalized for both customer booking threads and agent support threads (§6c), plus the unified admin inbox and the customer-side Messages tab in the account dashboard (§6h)
- Agent "new booking" email notification (§6g) — the cancellation/reschedule notifications (customer and agent) depend on Phase 3 infrastructure and land there instead

**Phase 3 — Automation & scale**
- Commission tiers (auto-evaluated monthly)
- Xendit Disbursements for automated monthly payouts, including the PDF/CSV statement generation and download (§8)
- Car Hire as a bookable product type: admin screens for car types (4/6-seater only, per §6a) + duration packages (6/8/10h), capacity-tier selector, disclosed cash overtime rate, and the price-by-starting-area grid
- Transport as a bookable product type: admin screens for manually-entered fixed pricing by starting area, defaulting to Senggigi
- Shared pickup time + meeting point picker for Car Hire and Transport (§6e), including the customer self-service pickup-time change
- Automated review-request email + review submission + rating-based moderation (§6d), plus the admin new-review notification email (§6g)
- Cancellation/reschedule/force-majeure flow: fee-schedule calculation, admin review queue, gift voucher issuance (§6f), plus the customer and agent cancellation/reschedule/gift-voucher notification emails (§6g)
- Indonesian language toggle (i18n)

**Phase 4 — Polish**
- Performance pass (image optimization, caching, Core Web Vitals)
- Guide/driver-facing daily manifest (if useful)
- Analytics (which agents/products/channels convert best)
- Enforce the narrower admin roles from §6k (Reservations/Accounting/Support) — once there's an actual second admin account to apply them to; the `role` field itself ships earlier, in Phase 1, alongside the single Super Admin account

---

## 13. Non-functional requirements

- **Performance**: sub-2s initial load on 4G; product images served via CDN/optimized formats (Next.js Image + Vercel's built-in image optimization).
- **Responsiveness**: mobile-first — most agent QR scans and many bookings will happen on phones.
- **Security**: never store raw card data (Xendit hosts this); verify all incoming webhook signatures; rate-limit the public `/r/[code]` and checkout endpoints against abuse.
- **Reliability of attribution**: agent commission is real money — attribution logic needs test coverage and an audit log (which booking, which agent, which cookie, timestamped) so disputes are resolvable.
- **Availability integrity**: capacity checks and slot decrement must be atomic (use database-level locking/transactions) to prevent two customers double-booking the last spot.
- **Data residency/compliance**: standard for an Indonesian consumer payments app — Xendit handles PCI scope; you're still responsible for customer data handling matching your existing privacy policy.

---

## 14. Decisions — resolved

These were open questions in an earlier draft; all five are now settled:

1. **Per-date capacity**: your current theme already tracks this, so Phase 1 syncs and enforces real, hard availability limits from day one (§5).
2. **Transport pricing**: manually entered in the app's admin, added once that screen is built (§5) — not synced from WordPress.
3. **Cancellation/refund policy**: a defined fee schedule (0% refund same-day/no-show, 65% at 1 day before, 90% at 2+ days before), calculated automatically but confirmed by manual staff review before a refund is issued. Force majeure (illness, etc.) bypasses the fee schedule entirely and offers reschedule or gift-voucher transfer instead — full details in §6f.
4. **WordPress "Partner User" accounts**: kept fully separate from the new Agent accounts for now, to avoid coupling two unproven systems together.
5. **Car Hire overage billing**: settled directly with the driver in cash, at a fixed rate disclosed to the customer before they book — no online billing, no saved-card requirement (§6a).

---

## 15. What I'd suggest right now

Build **Phase 1 only** first, end-to-end, live on the subdomain with real Xendit payments — even with just 2–3 real tours synced from WordPress. That proves the riskiest parts (WP sync, real payment, real booking) before agents are ever involved. Then Phase 2's agency layer sits on top of a foundation you've already validated with real money moving through it.
