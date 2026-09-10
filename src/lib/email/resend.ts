import "server-only";
import { formatIdr, formatUsd } from "@/lib/currency";
import { SUPPORT_EMAIL, WHATSAPP_NUMBER, whatsappLink } from "@/lib/contact";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Every send*Email function below whose recipient is a customer takes
 * a `locale` param and builds its own small `t = locale === "id" ? {...}
 * : {...}` translation object right where it's needed -- same "plain
 * object, not the shared UI dictionary" reasoning as CarHireFormDict
 * (src/components/CarHireBookingForm.tsx): these are HTML email bodies
 * with embedded conditional rows, not page-rendered dictionary-shaped
 * text, so they don't fit getDictionary()'s shape well. `ROW_LABELS`
 * just below covers the handful of one-word table labels (Booking
 * code, Date, ...) repeated across many of these emails.
 *
 * Staff-facing emails (sendNew*StaffEmail, sendPickupTimeChangedStaffEmail,
 * sendAdminNewReviewEmail) and Sales Agent emails (sendAgentApprovedEmail,
 * sendAgentBankChangeConfirmEmail, sendNewAgentStaffEmail) are
 * deliberately NOT translated -- staff and agents use the English-only
 * admin/agent panels regardless of a customer's language, same
 * intentional scope as those panels.
 */
const ROW_LABELS: Record<Locale, {
  bookingCode: string;
  date: string;
  travelers: string;
  totalPaid: string;
  total: string;
  discount: (code: string) => string;
  pickup: string;
  voucherCode: string;
  value: string;
  expires: string;
}> = {
  en: {
    bookingCode: "Booking code",
    date: "Date",
    travelers: "Travelers",
    totalPaid: "Total paid",
    total: "Total",
    discount: (code) => `Discount (${code})`,
    pickup: "Pickup",
    voucherCode: "Voucher code",
    value: "Value",
    expires: "Expires",
  },
  id: {
    bookingCode: "Kode pemesanan",
    date: "Tanggal",
    travelers: "Wisatawan",
    totalPaid: "Total dibayar",
    total: "Total",
    discount: (code) => `Diskon (${code})`,
    pickup: "Penjemputan",
    voucherCode: "Kode voucher",
    value: "Nilai",
    expires: "Kedaluwarsa",
  },
};

/**
 * Shared send -- both templates below go through this. Sends from
 * RESEND_FROM_EMAIL once a real domain is verified in Resend (e.g.
 * "Adventure Lombok Booking <no-reply@booking.adventure-lombok.com>").
 * Falls back to Resend's shared onboarding@resend.dev sender, which
 * works without verifying a domain but only actually delivers to the
 * email address the Resend account itself was signed up with -- fine
 * for proving the flow works, not for real customers or staff.
 *
 * Never throws -- a failed email should never block or undo a
 * successful payment. Logs the failure for later attention instead.
 */
async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured -- skipping email:", params.subject);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM_EMAIL ?? "Adventure Lombok Booking <onboarding@resend.dev>",
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error(`Resend email failed (HTTP ${response.status}):`, await response.text());
    }
  } catch (err) {
    console.error("Resend email failed:", err);
  }
}

interface BookingConfirmedEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  slotDate: string;
  paxCount: number;
  totalIdr: number;
  bookingCode: string;
  bookingUrl: string;
  discountCode?: string | null;
  discountAmountUsd?: number;
  /** Pre-formatted "pickup" line for Car Hire/Transport bookings (spec
   * §6a/§6e) -- e.g. "Sep 5, 2026, 8:00 AM from Senggigi (Toyota
   * Avanza, 8h)". Omitted entirely for every other product type. */
  pickupNote?: string | null;
  locale: Locale;
}

/** Sends the "booking confirmed" email (spec §6g) to the customer. */
export async function sendBookingConfirmedEmail(params: BookingConfirmedEmailParams): Promise<void> {
  const l = ROW_LABELS[params.locale];
  const t =
    params.locale === "id"
      ? {
          heading: "Pemesanan dikonfirmasi",
          greeting: (name: string) => `Hai ${name},`,
          body: (title: string) => `Pemesanan Anda untuk <strong>${title}</strong> telah dikonfirmasi.`,
          viewBooking: "Lihat pemesanan Anda",
          subject: (title: string) => `Pemesanan dikonfirmasi — ${title}`,
        }
      : {
          heading: "Booking confirmed",
          greeting: (name: string) => `Hi ${name},`,
          body: (title: string) => `Your booking for <strong>${title}</strong> is confirmed.`,
          viewBooking: "View your booking",
          subject: (title: string) => `Booking confirmed — ${title}`,
        };

  const discountRow =
    params.discountCode && params.discountAmountUsd
      ? `<tr><td style="padding: 6px 0; color: #4B5854;">${l.discount(escapeHtml(params.discountCode))}</td><td style="padding: 6px 0; text-align: right;">-${formatUsd(params.discountAmountUsd)}</td></tr>`
      : "";
  const pickupRow = params.pickupNote
    ? `<tr><td style="padding: 6px 0; color: #4B5854;">${l.pickup}</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.pickupNote)}</td></tr>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.greeting(escapeHtml(params.customerName))}</p>
      <p>${t.body(escapeHtml(params.productTitle))}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.bookingCode}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.date}</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.slotDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.travelers}</td><td style="padding: 6px 0; text-align: right;">${params.paxCount}</td></tr>
        ${pickupRow}
        ${discountRow}
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.totalPaid}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.totalIdr))}</td></tr>
      </table>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.viewBooking}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface PaymentFailedEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  slotDate: string;
  bookingCode: string;
  productUrl: string;
  locale: Locale;
}

/**
 * Not in the original spec -- added because a customer who abandons an
 * invoice (or whose payment is declined) previously got no signal at
 * all that their booking didn't go through, beyond whatever Xendit's
 * own page showed them in the moment. Covers both an active decline and
 * a silently-expired, never-completed invoice with the same email,
 * since the outcome for the customer is identical either way: nothing
 * was charged, and the spot was released.
 */
export async function sendPaymentFailedEmail(params: PaymentFailedEmailParams): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Pembayaran tidak berhasil",
          greeting: (name: string) => `Hai ${name},`,
          body: (title: string, date: string, code: string) =>
            `Percobaan pemesanan Anda untuk <strong>${title}</strong> pada ${date} (${code}) tidak selesai, jadi tidak ada biaya yang dikenakan.`,
          tryAgain: "Jika Anda masih ingin memesan, silakan coba lagi.",
          button: "Coba pesan lagi",
          subject: (title: string) => `Pembayaran tidak berhasil — ${title}`,
        }
      : {
          heading: "Payment didn&rsquo;t go through",
          greeting: (name: string) => `Hi ${name},`,
          body: (title: string, date: string, code: string) =>
            `Your booking attempt for <strong>${title}</strong> on ${date} (${code}) wasn&rsquo;t completed, so nothing was charged.`,
          tryAgain: "If you&rsquo;d still like to book, you&rsquo;re welcome to try again.",
          button: "Try booking again",
          subject: (title: string) => `Payment didn't go through — ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #B3441E;">${t.heading}</h1>
      <p>${t.greeting(escapeHtml(params.customerName))}</p>
      <p>${t.body(escapeHtml(params.productTitle), escapeHtml(params.slotDate), escapeHtml(params.bookingCode))}</p>
      <p>${t.tryAgain}</p>
      <p><a href="${params.productUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.button}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface NewBookingStaffEmailParams {
  toEmail: string;
  productTitle: string;
  slotDate: string;
  paxCount: number;
  totalIdr: number;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  /** Same pickup line as the customer email, so staff know where/when
   * to send the driver without opening the admin panel. */
  pickupNote?: string | null;
  /** Car Hire/Transport only -- a clickable wa.me link so whoever's
   * dispatching the driver can message the customer directly from
   * this email the moment the driver's on site. */
  pickupWhatsappNumber?: string | null;
  /** Car Hire/Transport only -- who's actually traveling, and their
   * flight details for an airport pickup so the driver can track it. */
  passengerName?: string | null;
  flightDetails?: string | null;
}

/**
 * Internal "a new paid booking just came in" notice -- goes to every
 * active admin_users row (spec doesn't yet have narrower roles enforced
 * in Phase 1, see §6k, so everyone active gets it for now) so someone
 * knows to start preparing the trip. Separate from the customer email
 * above so one failing never affects the other.
 */
export async function sendNewBookingStaffEmail(params: NewBookingStaffEmailParams): Promise<void> {
  const pickupRow = params.pickupNote
    ? `<tr><td style="padding: 6px 0; color: #4B5854;">Pickup</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.pickupNote)}</td></tr>`
    : "";
  const pickupWhatsappRow = params.pickupWhatsappNumber
    ? `<tr><td style="padding: 6px 0; color: #4B5854;">Driver contact</td><td style="padding: 6px 0; text-align: right;"><a href="https://wa.me/${params.pickupWhatsappNumber.replace(/\D/g, "")}" style="color: #0F766E; font-weight: 600;">${escapeHtml(params.pickupWhatsappNumber)} (WhatsApp)</a></td></tr>`
    : "";
  const passengerRow = params.passengerName
    ? `<tr><td style="padding: 6px 0; color: #4B5854;">Passenger</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.passengerName)}</td></tr>`
    : "";
  const flightRow = params.flightDetails
    ? `<tr><td style="padding: 6px 0; color: #4B5854;">Flight</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.flightDetails)}</td></tr>`
    : "";
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New booking paid</h1>
      <p><strong>${escapeHtml(params.productTitle)}</strong> was just booked and paid for.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Booking code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Date</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.slotDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Travelers</td><td style="padding: 6px 0; text-align: right;">${params.paxCount}</td></tr>
        ${pickupRow}
        ${passengerRow}
        ${flightRow}
        ${pickupWhatsappRow}
        <tr><td style="padding: 6px 0; color: #4B5854;">Total paid</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.totalIdr))}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Customer</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.customerName)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Customer email</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.customerEmail)}</td></tr>
        ${
          params.customerPhone
            ? `<tr><td style="padding: 6px 0; color: #4B5854;">Customer phone</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.customerPhone)}</td></tr>`
            : ""
        }
      </table>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `New booking — ${params.productTitle} (${params.bookingCode})`,
    html,
  });
}

interface PickupTimeChangedStaffEmailParams {
  toEmail: string;
  productTitle: string;
  bookingCode: string;
  customerName: string;
  oldPickupNote: string;
  newPickupNote: string;
}

/** Spec §6e's self-service pickup-time change -- staff need to know
 * right away so the driver can be re-briefed, not just find out from
 * the audit trail after the fact. */
export async function sendPickupTimeChangedStaffEmail(
  params: PickupTimeChangedStaffEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Pickup time changed</h1>
      <p>
        ${escapeHtml(params.customerName)} changed the pickup time for
        <strong>${escapeHtml(params.productTitle)}</strong> (${escapeHtml(params.bookingCode)}).
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Was</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.oldPickupNote)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Now</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.newPickupNote)}</td></tr>
      </table>
      <p>Please let the driver know.</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Pickup time changed — ${params.productTitle} (${params.bookingCode})`,
    html,
  });
}

interface NewAgentStaffEmailParams {
  toEmail: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string | null;
  referralCode: string;
}

/**
 * Internal "someone applied to become a Sales Agent" notice -- goes to
 * every active admin_users row, same reasoning as
 * sendNewBookingStaffEmail. Sales Agents don't confirm their own email
 * (Confirm email is off project-wide) -- an admin reviewing and
 * approving them at /admin/agents is the actual gate, so this is what
 * tells staff there's an application waiting.
 */
export async function sendNewAgentStaffEmail(params: NewAgentStaffEmailParams): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New Sales Agent application</h1>
      <p><strong>${escapeHtml(params.agentName)}</strong> just applied to become a Sales Agent.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Name</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.agentName)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Email</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.agentEmail)}</td></tr>
        ${
          params.agentPhone
            ? `<tr><td style="padding: 6px 0; color: #4B5854;">Phone</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.agentPhone)}</td></tr>`
            : ""
        }
        <tr><td style="padding: 6px 0; color: #4B5854;">Referral code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.referralCode)}</td></tr>
      </table>
      <p>Review and approve them at /admin/agents before their referral link goes live.</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `New Sales Agent application — ${params.agentName}`,
    html,
  });
}

interface AgentApprovedEmailParams {
  toEmail: string;
  agentName: string;
  referralCode: string;
  referralLink: string;
  dashboardUrl: string;
}

/**
 * Tells an agent they've been approved -- without this, the only way
 * they'd find out is by happening to log back into /agent themselves.
 * Fired once, right when an admin's status change actually crosses
 * into "active" (see updateAgentStatusAction), not on every save.
 */
export async function sendAgentApprovedEmail(params: AgentApprovedEmailParams): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">You're approved!</h1>
      <p>Hi ${escapeHtml(params.agentName)}, your Sales Agent application has been approved. Your referral link is live -- start sharing it to earn commission.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Referral code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.referralCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Referral link</td><td style="padding: 6px 0; text-align: right; word-break: break-all;">${escapeHtml(params.referralLink)}</td></tr>
      </table>
      <p><a href="${params.dashboardUrl}" style="color: #E4572E; font-weight: 600;">View your dashboard →</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: "You're approved as a Sales Agent!",
    html,
  });
}

interface AgentBankChangeConfirmEmailParams {
  toEmail: string;
  agentName: string;
  bankName: string;
  maskedAccountNumber: string;
  confirmUrl: string;
}

/**
 * Sent when an agent submits a new payout bank account (§6l). The
 * change is only staged in pending_bank_* columns until this link is
 * clicked -- a deliberate speed bump, since redirecting someone's
 * commission payout is exactly the kind of mistake, or fraud vector,
 * worth confirming out-of-band for. Expires after 24 hours
 * (enforced in agent_confirm_bank_change, not just in this copy).
 */
export async function sendAgentBankChangeConfirmEmail(
  params: AgentBankChangeConfirmEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Confirm your payout bank account</h1>
      <p>Hi ${escapeHtml(params.agentName)}, you asked to change the bank account your commission gets paid to:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Bank</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bankName)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Account number</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.maskedAccountNumber)}</td></tr>
      </table>
      <p>If this was you, confirm below. This link expires in 24 hours.</p>
      <p><a href="${params.confirmUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Confirm bank account change</a></p>
      <p style="color: #4B5854; font-size: 13px;">If you didn't request this, ignore this email -- your payout account won't change unless this link is clicked.</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: "Confirm your payout bank account change",
    html,
  });
}

interface BookingRequestReceivedEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  slotDate: string;
  bookingCode: string;
  locale: Locale;
}

/**
 * Sent the moment a manual-confirmation request (spec §6b -- Rinjani
 * and anything else flagged is_bookable = false) is submitted, before
 * any payment exists. Sets expectations: nothing's charged yet, this
 * is a request, park quota still needs manual checking.
 */
export async function sendBookingRequestReceivedEmail(
  params: BookingRequestReceivedEmailParams
): Promise<void> {
  const l = ROW_LABELS[params.locale];
  const t =
    params.locale === "id"
      ? {
          heading: "Permintaan diterima",
          body: (name: string, title: string, date: string) =>
            `Hai ${name}, kami telah menerima permintaan pemesanan Anda untuk <strong>${title}</strong> pada ${date}.`,
          notice:
            "Belum ada biaya yang dikenakan. Perjalanan ini memerlukan pemeriksaan manual ketersediaan izin taman sebelum kami dapat mengonfirmasi — kami akan mengirim email segera setelah kami tahu, biasanya dalam satu atau dua hari.",
          subject: (title: string) => `Permintaan diterima — ${title}`,
        }
      : {
          heading: "Request received",
          body: (name: string, title: string, date: string) =>
            `Hi ${name}, we've received your booking request for <strong>${title}</strong> on ${date}.`,
          notice:
            "Nothing has been charged yet. This trip needs us to manually check park permit availability before we can confirm -- we'll email you as soon as we know, usually within a day or two.",
          subject: (title: string) => `Request received — ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), escapeHtml(params.productTitle), escapeHtml(params.slotDate))}</p>
      <p>${t.notice}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.bookingCode}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
      </table>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface NewBookingRequestStaffEmailParams {
  toEmail: string;
  productTitle: string;
  slotDate: string;
  paxCount: number;
  bookingCode: string;
  customerName: string;
  reviewUrl: string;
}

/**
 * Internal "a Rinjani-style request needs review" notice -- same
 * reasoning as sendNewBookingStaffEmail, goes to every active
 * admin_users row since Phase 1 hasn't enforced §6k's narrower roles
 * yet. Without this, a request would just sit in /admin/requests with
 * nothing prompting anyone to go check it. reviewUrl deep-links
 * straight to this one request's detail page, not just the queue --
 * an earlier version wrote the path as plain text instead of a real
 * link, which isn't clickable in most mail clients.
 */
export async function sendNewBookingRequestStaffEmail(
  params: NewBookingRequestStaffEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New booking request needs review</h1>
      <p><strong>${escapeHtml(params.productTitle)}</strong> was just requested for ${escapeHtml(params.slotDate)} -- park quota needs to be checked before it can be confirmed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Booking code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Travelers</td><td style="padding: 6px 0; text-align: right;">${params.paxCount}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Customer</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.customerName)}</td></tr>
      </table>
      <p><a href="${params.reviewUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Review this request</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `New booking request — ${params.productTitle} (${params.bookingCode})`,
    html,
  });
}

interface BookingRequestConfirmedEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  slotDate: string;
  bookingCode: string;
  totalIdr: number;
  paymentUrl: string;
  locale: Locale;
}

/**
 * Sent the moment an admin confirms park quota availability -- the
 * payment link's Xendit invoice is created with a 24h expiry right
 * alongside this, so "expires in 24 hours" here is a statement of
 * fact, not just copy.
 */
export async function sendBookingRequestConfirmedEmail(
  params: BookingRequestConfirmedEmailParams
): Promise<void> {
  const l = ROW_LABELS[params.locale];
  const t =
    params.locale === "id"
      ? {
          heading: "Anda dikonfirmasi — selesaikan pembayaran untuk mengamankan tempat Anda",
          body: (name: string, title: string, date: string) =>
            `Hai ${name}, kabar baik: izin taman tersedia untuk <strong>${title}</strong> pada ${date}.`,
          notice:
            "Selesaikan pembayaran dalam <strong>24 jam</strong> untuk mengunci tempat Anda — setelah itu, tempat akan dilepas kembali ke ketersediaan umum.",
          button: "Selesaikan pembayaran",
          subject: (title: string) => `Dikonfirmasi — selesaikan pembayaran untuk ${title}`,
        }
      : {
          heading: "You're confirmed — complete payment to secure your spot",
          body: (name: string, title: string, date: string) =>
            `Hi ${name}, good news: park permits are available for <strong>${title}</strong> on ${date}.`,
          notice:
            "Complete payment within <strong>24 hours</strong> to lock in your spot -- after that, it's released back to general availability.",
          button: "Complete payment",
          subject: (title: string) => `Confirmed — complete payment for ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), escapeHtml(params.productTitle), escapeHtml(params.slotDate))}</p>
      <p>${t.notice}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.bookingCode}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.total}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.totalIdr))}</td></tr>
      </table>
      <p><a href="${params.paymentUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.button}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface BookingRequestDeclinedEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  slotDate: string;
  bookingCode: string;
  declineReason: string;
  productUrl: string;
  locale: Locale;
}

/** Sent when park quota isn't available -- nothing was ever charged
 * (no invoice exists yet at this point in the flow), so this is purely
 * informational, with the reason shown per spec §6b so a customer
 * knows whether trying a different date is worth it. */
export async function sendBookingRequestDeclinedEmail(
  params: BookingRequestDeclinedEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Kami tidak dapat mengonfirmasi permintaan ini",
          body: (name: string, title: string, date: string, code: string) =>
            `Hai ${name}, sayangnya kami tidak dapat mengonfirmasi <strong>${title}</strong> pada ${date} (${code}).`,
          notice: "Tidak ada biaya yang dikenakan. Anda dipersilakan untuk mengajukan tanggal lain.",
          button: "Coba tanggal lain",
          subject: (title: string) => `Tidak dapat dikonfirmasi — ${title}`,
        }
      : {
          heading: "We couldn't confirm this request",
          body: (name: string, title: string, date: string, code: string) =>
            `Hi ${name}, unfortunately we couldn't confirm <strong>${title}</strong> on ${date} (${code}).`,
          notice: "Nothing was charged. You're welcome to request a different date.",
          button: "Try another date",
          subject: (title: string) => `Couldn't confirm — ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #B3441E;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), escapeHtml(params.productTitle), escapeHtml(params.slotDate), escapeHtml(params.bookingCode))}</p>
      <p style="color: #4B5854;">${escapeHtml(params.declineReason)}</p>
      <p>${t.notice}</p>
      <p><a href="${params.productUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.button}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface NewStaffReplyEmailParams {
  toEmail: string;
  recipientName: string;
  contextLabel: string;
  messageBody: string;
  threadUrl: string;
  /** Despite the function name (named for who triggered it -- staff --
   * not who receives it), the recipient here is whoever's on the other
   * side of the thread: a customer or a Sales Agent. Callers pass the
   * customer's preferred_locale, or "en" for an agent recipient (the
   * agent panel stays English-only). */
  locale: Locale;
}

/**
 * Sent to whoever's on the other side of a chat thread (spec §6b/§6c)
 * when staff replies -- without this, someone who messaged and then
 * closed the tab has no way of knowing an answer arrived, since chat
 * notifications otherwise only show up live via Realtime while the
 * page is actually open. Deliberately one-directional: staff already
 * work from the inbox itself and the Overview's open-count card, so a
 * customer/agent message doesn't also fire an email per message --
 * that would just be noise for a solo operator answering their own
 * inbox.
 */
export async function sendNewStaffReplyEmail(params: NewStaffReplyEmailParams): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Balasan baru",
          body: (name: string, context: string) => `Hai ${name}, Anda memiliki pesan baru tentang ${context}:`,
          button: "Balas",
          subject: (context: string) => `Balasan baru — ${context}`,
        }
      : {
          heading: "New reply",
          body: (name: string, context: string) => `Hi ${name}, you have a new message about ${context}:`,
          button: "Reply",
          subject: (context: string) => `New reply — ${context}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.recipientName), escapeHtml(params.contextLabel))}</p>
      <p style="border-left: 3px solid #E1613C; padding-left: 12px; color: #182421;">${escapeHtml(params.messageBody)}</p>
      <p><a href="${params.threadUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.button}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.contextLabel),
    html,
  });
}

interface NewConversationStaffEmailParams {
  toEmail: string;
  fromName: string;
  contextLabel: string;
  messageBody: string;
  inboxUrl: string;
}

/**
 * Internal "someone started a new chat thread" notice -- fired once,
 * on the message that actually creates the conversation (see
 * getOrCreateConversation's `created` flag), not on every message
 * after that. Every message after the first shows up live via
 * Realtime and the Overview's open-count card while someone's
 * actively in the inbox; this is what catches the case where nobody
 * currently has it open.
 */
export async function sendNewConversationStaffEmail(
  params: NewConversationStaffEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New message</h1>
      <p><strong>${escapeHtml(params.fromName)}</strong> started a new conversation about ${escapeHtml(params.contextLabel)}:</p>
      <p style="border-left: 3px solid #E1613C; padding-left: 12px; color: #182421;">${escapeHtml(params.messageBody)}</p>
      <p><a href="${params.inboxUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Reply</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `New message — ${params.fromName}`,
    html,
  });
}

interface CancellationRequestReceivedEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  bookingCode: string;
  path: "standard" | "force_majeure";
  calculatedRefundIdr: number | null;
  bookingUrl: string;
  locale: Locale;
}

/** Sent the moment a cancellation/reschedule request (spec §6f) is
 * submitted -- for the standard path this can show the calculated
 * refund immediately, since that's computed the instant the request
 * comes in; force majeure always needs manual review first, so
 * there's no number to show yet. Every cancellation-flow email links
 * back to the booking page -- that's also where the per-booking chat
 * (§6b/§6c) lives, so it's how a customer keeps talking to staff about
 * this request without starting a whole new thread. */
export async function sendCancellationRequestReceivedEmail(
  params: CancellationRequestReceivedEmailParams
): Promise<void> {
  const isId = params.locale === "id";
  const t = isId
    ? {
        heading: "Permintaan diterima",
        body: (name: string, kind: string, title: string, code: string) =>
          `Hai ${name}, kami telah menerima permintaan ${kind} Anda untuk <strong>${title}</strong> (${code}).`,
        pathLabel: params.path === "force_majeure" ? "force majeure" : "pembatalan",
        withRefund: (amount: string) =>
          `Berdasarkan kebijakan pembatalan kami, perkiraan pengembalian dana Anda adalah <strong>${amount}</strong>. Staf kami akan meninjau dan mengonfirmasi sebelum ada yang dikembalikan.`,
        withoutRefund: "Staf kami akan meninjau dokumentasi pendukung Anda dan menghubungi Anda kembali.",
        viewBooking: "Lihat pemesanan Anda",
        subject: (title: string) => `Permintaan diterima — ${title}`,
      }
    : {
        heading: "Request received",
        body: (name: string, kind: string, title: string, code: string) =>
          `Hi ${name}, we've received your ${kind} request for <strong>${title}</strong> (${code}).`,
        pathLabel: params.path === "force_majeure" ? "force majeure" : "cancellation",
        withRefund: (amount: string) =>
          `Based on our cancellation policy, your calculated refund is <strong>${amount}</strong>. A staff member will review and confirm before anything is refunded.`,
        withoutRefund: "A staff member will review your supporting documentation and get back to you.",
        viewBooking: "View your booking",
        subject: (title: string) => `Request received — ${title}`,
      };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), t.pathLabel, escapeHtml(params.productTitle), escapeHtml(params.bookingCode))}</p>
      ${
        params.calculatedRefundIdr != null
          ? `<p>${t.withRefund(escapeHtml(formatIdr(params.calculatedRefundIdr)))}</p>`
          : `<p>${t.withoutRefund}</p>`
      }
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.viewBooking}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface NewCancellationStaffEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  bookingCode: string;
  path: "standard" | "force_majeure";
  preferredResolutionLabel: string;
  preferredNewDate: string | null;
  preferredGiftRecipient: string | null;
  reviewUrl: string;
}

/** Internal "a cancellation/reschedule request needs review" notice --
 * same reasoning as sendNewBookingRequestStaffEmail. Surfaces the
 * customer's stated preference up front so staff aren't hunting for it
 * in the free-text reason. */
export async function sendNewCancellationStaffEmail(
  params: NewCancellationStaffEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New ${params.path === "force_majeure" ? "force majeure" : "cancellation"} request</h1>
      <p><strong>${escapeHtml(params.customerName)}</strong> requested to cancel/reschedule <strong>${escapeHtml(params.productTitle)}</strong> (${escapeHtml(params.bookingCode)}).</p>
      <p>They'd prefer: <strong>${escapeHtml(params.preferredResolutionLabel)}</strong>${
        params.preferredNewDate
          ? ` -- new date requested: <strong>${escapeHtml(params.preferredNewDate)}</strong>`
          : ""
      }${
        params.preferredGiftRecipient
          ? ` -- for: <strong>${escapeHtml(params.preferredGiftRecipient)}</strong>`
          : ""
      }.</p>
      <p><a href="${params.reviewUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Review this request</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `New cancellation request — ${params.productTitle} (${params.bookingCode})`,
    html,
  });
}

interface CancellationApprovedRefundEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  bookingCode: string;
  refundAmountIdr: number;
  bookingUrl: string;
  locale: Locale;
}

export async function sendCancellationApprovedRefundEmail(
  params: CancellationApprovedRefundEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Pembatalan Anda disetujui",
          body: (name: string, title: string, code: string) =>
            `Hai ${name}, pembatalan Anda untuk <strong>${title}</strong> (${code}) telah disetujui.`,
          refund: (amount: string) =>
            `Jumlah pengembalian dana: <strong>${amount}</strong>. Ini akan diproses ke metode pembayaran asli Anda — mohon tunggu beberapa hari kerja.`,
          viewBooking: "Lihat pemesanan Anda",
          subject: (title: string) => `Pembatalan disetujui — ${title}`,
        }
      : {
          heading: "Your cancellation is approved",
          body: (name: string, title: string, code: string) =>
            `Hi ${name}, your cancellation for <strong>${title}</strong> (${code}) has been approved.`,
          refund: (amount: string) =>
            `Refund amount: <strong>${amount}</strong>. This will be processed to your original payment method -- please allow a few business days.`,
          viewBooking: "View your booking",
          subject: (title: string) => `Cancellation approved — ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), escapeHtml(params.productTitle), escapeHtml(params.bookingCode))}</p>
      <p>${t.refund(escapeHtml(formatIdr(params.refundAmountIdr)))}</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.viewBooking}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface CancellationApprovedRescheduleEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  bookingCode: string;
  newSlotDate: string;
  bookingUrl: string;
  locale: Locale;
}

export async function sendCancellationApprovedRescheduleEmail(
  params: CancellationApprovedRescheduleEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Jadwal Anda telah diubah",
          body: (name: string, title: string, code: string) =>
            `Hai ${name}, permintaan Anda untuk menjadwalkan ulang <strong>${title}</strong> (${code}) telah disetujui — tanpa biaya.`,
          newDate: (date: string) => `Tanggal baru: <strong>${date}</strong>.`,
          viewBooking: "Lihat pemesanan Anda",
          subject: (title: string) => `Dijadwalkan ulang — ${title}`,
        }
      : {
          heading: "You're rescheduled",
          body: (name: string, title: string, code: string) =>
            `Hi ${name}, your request to reschedule <strong>${title}</strong> (${code}) has been approved -- no fee.`,
          newDate: (date: string) => `New date: <strong>${date}</strong>.`,
          viewBooking: "View your booking",
          subject: (title: string) => `Rescheduled — ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), escapeHtml(params.productTitle), escapeHtml(params.bookingCode))}</p>
      <p>${t.newDate(escapeHtml(params.newSlotDate))}</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.viewBooking}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface CancellationApprovedGiftVoucherEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  bookingCode: string;
  voucherCode: string;
  valueIdr: number;
  recipientName: string;
  expiresAt: string;
  bookingUrl: string;
  redeemUrl: string;
  locale: Locale;
}

/** Goes to the *original* customer, who's expected to forward the code
 * to the recipient themselves -- this app has no account or contact
 * info for the recipient yet at this point. Explicitly spells out how
 * the recipient redeems it (the /redeem page, plus a support email as
 * a fallback) -- previously this just said "contact us" with no
 * channel, which left both the customer and the recipient guessing. */
export async function sendCancellationApprovedGiftVoucherEmail(
  params: CancellationApprovedGiftVoucherEmailParams
): Promise<void> {
  const l = ROW_LABELS[params.locale];
  const waLink = whatsappLink(`Hi, I'd like to redeem gift voucher ${params.voucherCode}`);
  const t =
    params.locale === "id"
      ? {
          heading: "Voucher hadiah Anda sudah siap",
          body: (name: string, title: string, code: string, recipient: string) =>
            `Hai ${name}, permintaan Anda untuk <strong>${title}</strong> (${code}) telah diubah menjadi voucher hadiah untuk ${recipient}.`,
          forward: (recipient: string) =>
            `Silakan teruskan email ini atau bagikan kode di atas kepada ${recipient}. Saat mereka siap memesan, berikut yang harus mereka lakukan:`,
          redeemButton: "Tukarkan voucher ini",
          reachDirectly: (email: string, waLine: string) =>
            `Halaman itu memandu mereka mengirimkan detail dan tanggal pilihan mereka. Jika mereka ingin menghubungi kami langsung: email <a href="mailto:${email}" style="color: #1E7A73;">${email}</a> dengan menyebutkan kode voucher${waLine}.`,
          viewBooking: "Lihat pemesanan Anda",
          subject: (code: string) => `Voucher hadiah Anda — ${code}`,
        }
      : {
          heading: "Your gift voucher is ready",
          body: (name: string, title: string, code: string, recipient: string) =>
            `Hi ${name}, your request for <strong>${title}</strong> (${code}) has been converted into a gift voucher for ${recipient}.`,
          forward: (recipient: string) =>
            `Please forward this email or share the code above with ${recipient}. When they're ready to book, here's exactly what they should do:`,
          redeemButton: "Redeem this voucher",
          reachDirectly: (email: string, waLine: string) =>
            `That page walks them through submitting their details and preferred date. If they'd rather reach us directly: email <a href="mailto:${email}" style="color: #1E7A73;">${email}</a> quoting the voucher code${waLine}.`,
          viewBooking: "View your booking",
          subject: (code: string) => `Your gift voucher — ${code}`,
        };
  const waLine = waLink
    ? params.locale === "id"
      ? ` atau WhatsApp kami di <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
      : ` or WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), escapeHtml(params.productTitle), escapeHtml(params.bookingCode), escapeHtml(params.recipientName))}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.voucherCode}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.voucherCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.value}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.valueIdr))}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.expires}</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(new Date(params.expiresAt).toLocaleDateString())}</td></tr>
      </table>
      <p>${t.forward(escapeHtml(params.recipientName))}</p>
      <p><a href="${params.redeemUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.redeemButton}</a></p>
      <p style="color: #4B5854; font-size: 14px;">
        ${t.reachDirectly(escapeHtml(SUPPORT_EMAIL), waLine)}
      </p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.viewBooking}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.voucherCode),
    html,
  });
}

/** Shared "how to reach us" block for anyone with no booking page to
 * fall back on yet (a gift recipient before their account exists, or
 * even after). Three channels, all pointing at the same place: create
 * an account (so future contact happens as a real conversation on
 * their own booking page, same as any other customer), or reach us
 * directly by WhatsApp (only rendered once a number is actually
 * configured) or email. */
function contactChannelsHtml(opts: { voucherCode: string; signupEmail?: string; locale: Locale }): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pathPrefix = opts.locale === "id" ? "/id" : "";
  const waLink = whatsappLink(`Hi, I'm asking about gift voucher ${opts.voucherCode}`);
  // Lands them back on their own voucher's page post-signup (it'll show
  // their request is already on file) instead of the bare homepage.
  const returnTo = `${pathPrefix}/redeem?code=${encodeURIComponent(opts.voucherCode)}`;
  const signupHref = opts.signupEmail
    ? `${siteUrl}${pathPrefix}/login?mode=signup&email=${encodeURIComponent(opts.signupEmail)}&return_to=${encodeURIComponent(returnTo)}`
    : `${siteUrl}${pathPrefix}/login?mode=signup&return_to=${encodeURIComponent(returnTo)}`;
  const t =
    opts.locale === "id"
      ? {
          heading: "Cara menghubungi kami",
          createAccount: "Buat akun gratis",
          createAccountRest: "— setelah Anda memilikinya, Anda dapat menghubungi kami kapan saja dari halaman perjalanan Anda di aplikasi.",
          emailUs: "Email",
          quoting: (code: string) => `dengan menyebutkan voucher ${code}.`,
          whatsappUs: "WhatsApp kami di",
        }
      : {
          heading: "Ways to reach us",
          createAccount: "Create a free account",
          createAccountRest: "-- once you have one, you can message us any time from your trip's page in the app.",
          emailUs: "Email",
          quoting: (code: string) => `quoting voucher ${code}.`,
          whatsappUs: "WhatsApp us at",
        };
  return `
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4DFD4;">
      <p style="font-weight: 600; color: #0F3A3D;">${t.heading}</p>
      <ul style="padding-left: 18px; color: #4B5854;">
        <li><a href="${signupHref}" style="color: #1E7A73;">${t.createAccount}</a> ${t.createAccountRest}</li>
        <li>${t.emailUs} <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a> ${t.quoting(escapeHtml(opts.voucherCode))}</li>
        ${
          waLink
            ? `<li>${t.whatsappUs} <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>.</li>`
            : ""
        }
      </ul>
    </div>
  `;
}

interface VoucherRedemptionReceivedEmailParams {
  toEmail: string;
  recipientName: string;
  productTitle: string;
  voucherCode: string;
  locale: Locale;
}

/** Confirms to whoever just submitted the /redeem form that it went
 * through -- they have no account and no booking page to check, so
 * this email is the only receipt they get. Points them at every way to
 * reach us right away, rather than leaving them to wait and wonder. */
export async function sendVoucherRedemptionReceivedEmail(
  params: VoucherRedemptionReceivedEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Permintaan penukaran Anda diterima",
          body: (name: string, code: string, title: string) =>
            `Hai ${name}, kami telah menerima permintaan Anda untuk menukarkan voucher <strong>${code}</strong> untuk <strong>${title}</strong>.`,
          notice: "Kami akan segera menghubungi Anda untuk mengonfirmasi tanggal dan detail perjalanan Anda.",
          subject: (code: string) => `Permintaan penukaran diterima — ${code}`,
        }
      : {
          heading: "Got your redemption request",
          body: (name: string, code: string, title: string) =>
            `Hi ${name}, we've received your request to redeem voucher <strong>${code}</strong> for <strong>${title}</strong>.`,
          notice: "We'll be in touch shortly to confirm your date and the trip details.",
          subject: (code: string) => `Redemption request received — ${code}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.recipientName), escapeHtml(params.voucherCode), escapeHtml(params.productTitle))}</p>
      <p>${t.notice}</p>
      ${contactChannelsHtml({ voucherCode: params.voucherCode, signupEmail: params.toEmail, locale: params.locale })}
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.voucherCode),
    html,
  });
}

interface VoucherRedeemedNeedsAccountEmailParams {
  toEmail: string;
  recipientName: string;
  productTitle: string;
  voucherCode: string;
  locale: Locale;
}

/** Sent when staff try to confirm a redemption but no account exists
 * yet under the email the recipient gave us -- a booking can only ever
 * belong to a real account, so this is the one thing standing between
 * them and a trip they can see and message us about. */
export async function sendVoucherRedeemedNeedsAccountEmail(
  params: VoucherRedeemedNeedsAccountEmailParams
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pathPrefix = params.locale === "id" ? "/id" : "";
  const returnTo = `${pathPrefix}/redeem?code=${encodeURIComponent(params.voucherCode)}`;
  const signupHref = `${siteUrl}${pathPrefix}/login?mode=signup&email=${encodeURIComponent(params.toEmail)}&return_to=${encodeURIComponent(returnTo)}`;
  const t =
    params.locale === "id"
      ? {
          heading: (title: string) => `Satu langkah lagi untuk ${title}`,
          body: (name: string, email: string) =>
            `Hai ${name}, kami siap mengonfirmasi perjalanan Anda — kami hanya perlu Anda membuat akun gratis terlebih dahulu, menggunakan alamat email yang sama ini (${email}). Itulah yang memungkinkan kami menghubungkan perjalanan Anda ke akun Anda sehingga Anda dapat melihatnya dan menghubungi kami kapan saja.`,
          button: "Buat akun Anda",
          afterSignup: "Anda akan kembali ke halaman voucher Anda setelah mendaftar — tidak perlu melakukan apa pun lagi, kami akan mengonfirmasi perjalanan Anda dari pihak kami segera setelahnya.",
          inAHurry: "Terburu-buru? Email",
          subject: "Hampir sampai — buat akun Anda untuk mengonfirmasi perjalanan Anda",
        }
      : {
          heading: (title: string) => `One more step for ${title}`,
          body: (name: string, email: string) =>
            `Hi ${name}, we're ready to confirm your trip -- we just need you to create a free account first, using this same email address (${email}). That's what lets us attach your trip to your account so you can see it and message us any time.`,
          button: "Create your account",
          afterSignup: "You'll land back on your voucher page once you're signed up -- no need to do anything else, we'll confirm your trip from our end shortly after.",
          inAHurry: "In a hurry? Email",
          subject: "Almost there — create your account to confirm your trip",
        };
  const waLink = whatsappLink(`Hi, I'm setting up my account to redeem a gift voucher`);
  const waLine = waLink
    ? params.locale === "id"
      ? ` atau WhatsApp kami di <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
      : ` or WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading(escapeHtml(params.productTitle))}</h1>
      <p>${t.body(escapeHtml(params.recipientName), escapeHtml(params.toEmail))}</p>
      <p><a href="${signupHref}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.button}</a></p>
      <p style="color: #4B5854;">${t.afterSignup}</p>
      <p style="color: #4B5854;">${t.inAHurry} <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a>${waLine}.</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject,
    html,
  });
}

interface VoucherRedeemedBookingConfirmedEmailParams {
  toEmail: string;
  recipientName: string;
  productTitle: string;
  slotDate: string;
  bookingUrl: string;
  locale: Locale;
}

/** The actual "you're all set" moment -- a real booking now exists
 * under their account, so this links straight to it (chat panel and
 * all) instead of repeating the generic contact channels. */
export async function sendVoucherRedeemedBookingConfirmedEmail(
  params: VoucherRedeemedBookingConfirmedEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Semua sudah siap!",
          body: (name: string, title: string, date: string) =>
            `Hai ${name}, perjalanan hadiah Anda telah dikonfirmasi: <strong>${title}</strong> pada <strong>${date}</strong>. Tidak perlu pembayaran lebih lanjut — sudah tercakup oleh voucher.`,
          viewTrip: "Lihat perjalanan Anda",
          contact: "Anda dapat menghubungi kami kapan saja dari halaman itu — titik penjemputan, detail hotel, apa pun. Ada pertanyaan sekarang? Email",
          subject: (title: string) => `Semua sudah siap — ${title}`,
        }
      : {
          heading: "You're all set!",
          body: (name: string, title: string, date: string) =>
            `Hi ${name}, your gift trip is confirmed: <strong>${title}</strong> on <strong>${date}</strong>. No further payment needed -- it's already covered by the voucher.`,
          viewTrip: "View your trip",
          contact: "You can message us any time from that page -- pickup point, hotel details, anything at all. Questions right now? Email",
          subject: (title: string) => `You're all set — ${title}`,
        };
  const waLink = whatsappLink(`Hi, I have a question about my trip: ${params.productTitle}`);
  const waLine = waLink
    ? params.locale === "id"
      ? ` atau WhatsApp kami di <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
      : ` or WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.recipientName), escapeHtml(params.productTitle), escapeHtml(params.slotDate))}</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.viewTrip}</a></p>
      <p style="color: #4B5854;">${t.contact} <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a>${waLine}.</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface GiftVoucherRedeemedNotifyGiverEmailParams {
  toEmail: string;
  giverName: string;
  recipientName: string;
  productTitle: string;
  slotDate: string;
  locale: Locale;
}

/** The person who originally converted their trip into a gift voucher
 * otherwise never hears anything again -- every other email in this
 * flow goes to the recipient. Sent once redemption is confirmed, so
 * they know their gift actually reached someone and got used. */
export async function sendGiftVoucherRedeemedNotifyGiverEmail(
  params: GiftVoucherRedeemedNotifyGiverEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Hadiah Anda telah ditukarkan!",
          body: (name: string, recipient: string, title: string, date: string) =>
            `Hai ${name}, kabar baik — ${recipient} baru saja menukarkan voucher hadiah yang Anda buat untuk <strong>${title}</strong>. Perjalanan mereka telah dikonfirmasi untuk <strong>${date}</strong>.`,
          notice: "Itu saja — tidak ada lagi yang perlu Anda lakukan. Terima kasih sudah memikirkan mereka!",
          subject: (title: string) => `Hadiah Anda telah ditukarkan — ${title}`,
        }
      : {
          heading: "Your gift was redeemed!",
          body: (name: string, recipient: string, title: string, date: string) =>
            `Hi ${name}, good news -- ${recipient} just redeemed the gift voucher you set up for <strong>${title}</strong>. Their trip is confirmed for <strong>${date}</strong>.`,
          notice: "That's it -- nothing further needed from you. Thanks for thinking of them!",
          subject: (title: string) => `Your gift was redeemed — ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.giverName), escapeHtml(params.recipientName), escapeHtml(params.productTitle), escapeHtml(params.slotDate))}</p>
      <p style="color: #4B5854;">${t.notice}</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface VoucherRedemptionRequestStaffEmailParams {
  toEmail: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  productTitle: string;
  voucherCode: string;
  requestedSlotDate: string | null;
  requestedPaxCount: number | null;
  message: string | null;
  reviewUrl: string;
}

/** Internal "someone wants to redeem a gift voucher" notice -- same
 * reasoning as sendNewCancellationStaffEmail. This is the only place
 * staff learn a redemption request came in at all. */
export async function sendVoucherRedemptionRequestStaffEmail(
  params: VoucherRedemptionRequestStaffEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Gift voucher redemption request</h1>
      <p><strong>${escapeHtml(params.recipientName)}</strong> (${escapeHtml(params.recipientEmail)}${params.recipientPhone ? `, ${escapeHtml(params.recipientPhone)}` : ""}) wants to redeem voucher <strong>${escapeHtml(params.voucherCode)}</strong> for <strong>${escapeHtml(params.productTitle)}</strong>.</p>
      ${params.requestedSlotDate ? `<p>Preferred date: <strong>${escapeHtml(params.requestedSlotDate)}</strong></p>` : ""}
      ${params.requestedPaxCount ? `<p>Travelers: <strong>${params.requestedPaxCount}</strong></p>` : ""}
      ${params.message ? `<p style="color: #4B5854;">"${escapeHtml(params.message)}"</p>` : ""}
      <p><a href="${params.reviewUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Review this voucher</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Voucher redemption request — ${params.voucherCode}`,
    html,
  });
}

interface CancellationRejectedEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  bookingCode: string;
  adminNotes: string | null;
  bookingUrl: string;
  locale: Locale;
}

export async function sendCancellationRejectedEmail(
  params: CancellationRejectedEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Permintaan Anda tidak disetujui",
          body: (name: string, title: string, code: string) =>
            `Hai ${name}, kami tidak dapat menyetujui permintaan pembatalan/penjadwalan ulang Anda untuk <strong>${title}</strong> (${code}).`,
          contact: "Hubungi kami jika Anda memiliki pertanyaan — kirim pesan kepada kami kapan saja dari halaman pemesanan Anda.",
          viewBooking: "Lihat pemesanan Anda",
          subject: (title: string) => `Kabar terbaru tentang permintaan Anda — ${title}`,
        }
      : {
          heading: "Your request wasn't approved",
          body: (name: string, title: string, code: string) =>
            `Hi ${name}, we weren't able to approve your cancellation/reschedule request for <strong>${title}</strong> (${code}).`,
          contact: "Contact us if you have questions -- message us any time from your booking page.",
          viewBooking: "View your booking",
          subject: (title: string) => `Update on your request — ${title}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #B3441E;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.customerName), escapeHtml(params.productTitle), escapeHtml(params.bookingCode))}</p>
      ${params.adminNotes ? `<p style="color: #4B5854;">${escapeHtml(params.adminNotes)}</p>` : ""}
      <p>${t.contact}</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.viewBooking}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface GiftVoucherPurchaseConfirmedEmailParams {
  toEmail: string;
  purchaserName: string;
  productTitle: string;
  voucherCode: string;
  valueIdr: number;
  recipientName: string;
  expiresAt: string;
  redeemUrl: string;
  locale: Locale;
}

/** Sent once payment for a standalone-purchased gift voucher (not one
 * from cancelling a booking) is confirmed -- same "share this code,
 * here's how they redeem it" shape as
 * sendCancellationApprovedGiftVoucherEmail, just with purchase-
 * appropriate copy instead of "your request was converted." */
export async function sendGiftVoucherPurchaseConfirmedEmail(
  params: GiftVoucherPurchaseConfirmedEmailParams
): Promise<void> {
  const l = ROW_LABELS[params.locale];
  const waLink = whatsappLink(`Hi, I'd like to redeem gift voucher ${params.voucherCode}`);
  const t =
    params.locale === "id"
      ? {
          heading: "Voucher hadiah Anda sudah siap",
          body: (name: string, title: string, recipient: string) =>
            `Hai ${name}, terima kasih atas pembelian Anda — <strong>${title}</strong> kini menjadi voucher hadiah untuk ${recipient}.`,
          forward: (recipient: string) =>
            `Silakan teruskan email ini atau bagikan kode di atas kepada ${recipient}. Saat mereka siap memesan, berikut yang harus mereka lakukan:`,
          redeemButton: "Tukarkan voucher ini",
          reachDirectly: (email: string, waLine: string) =>
            `Halaman itu memandu mereka mengirimkan detail dan tanggal pilihan mereka. Jika mereka ingin menghubungi kami langsung: email <a href="mailto:${email}" style="color: #1E7A73;">${email}</a> dengan menyebutkan kode voucher${waLine}.`,
          subject: (code: string) => `Voucher hadiah Anda — ${code}`,
        }
      : {
          heading: "Your gift voucher is ready",
          body: (name: string, title: string, recipient: string) =>
            `Hi ${name}, thanks for your purchase -- <strong>${title}</strong> is now a gift voucher for ${recipient}.`,
          forward: (recipient: string) =>
            `Please forward this email or share the code above with ${recipient}. When they're ready to book, here's exactly what they should do:`,
          redeemButton: "Redeem this voucher",
          reachDirectly: (email: string, waLine: string) =>
            `That page walks them through submitting their details and preferred date. If they'd rather reach us directly: email <a href="mailto:${email}" style="color: #1E7A73;">${email}</a> quoting the voucher code${waLine}.`,
          subject: (code: string) => `Your gift voucher — ${code}`,
        };
  const waLine = waLink
    ? params.locale === "id"
      ? ` atau WhatsApp kami di <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
      : ` or WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.purchaserName), escapeHtml(params.productTitle), escapeHtml(params.recipientName))}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.voucherCode}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.voucherCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.value}</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.valueIdr))}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">${l.expires}</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(new Date(params.expiresAt).toLocaleDateString())}</td></tr>
      </table>
      <p>${t.forward(escapeHtml(params.recipientName))}</p>
      <p><a href="${params.redeemUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.redeemButton}</a></p>
      <p style="color: #4B5854; font-size: 14px;">
        ${t.reachDirectly(escapeHtml(SUPPORT_EMAIL), waLine)}
      </p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.voucherCode),
    html,
  });
}

interface NewGiftVoucherPurchaseStaffEmailParams {
  toEmail: string;
  productTitle: string;
  valueIdr: number;
  voucherCode: string;
  purchaserName: string;
  purchaserEmail: string;
  recipientName: string;
}

/** Internal "a gift voucher was just bought and paid for" notice --
 * same reasoning as sendNewBookingStaffEmail, for the same reason: a
 * standalone gift purchase moves money the same way a normal booking
 * does, so staff should hear about it the same way. */
export async function sendNewGiftVoucherPurchaseStaffEmail(
  params: NewGiftVoucherPurchaseStaffEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New gift voucher purchased</h1>
      <p><strong>${escapeHtml(params.productTitle)}</strong> was just bought as a gift and paid for.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Voucher code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.voucherCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Value</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.valueIdr))}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Purchased by</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.purchaserName)} (${escapeHtml(params.purchaserEmail)})</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">For</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.recipientName)}</td></tr>
      </table>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `New gift voucher purchased — ${params.voucherCode}`,
    html,
  });
}

interface GiftVoucherRefundRequestedEmailParams {
  toEmail: string;
  purchaserName: string;
  productTitle: string;
  voucherCode: string;
  locale: Locale;
}

/** Confirms to the purchaser that their "please refund this gift I
 * bought" request went through -- same reasoning as every other
 * "request received" email in this app: the only receipt they get
 * until staff act on it. */
export async function sendGiftVoucherRefundRequestedEmail(
  params: GiftVoucherRefundRequestedEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Permintaan pengembalian dana Anda diterima",
          body: (name: string, code: string, title: string) =>
            `Hai ${name}, kami telah menerima permintaan Anda untuk mengembalikan dana voucher hadiah <strong>${code}</strong> untuk <strong>${title}</strong>.`,
          notice: "Kami akan meninjaunya dan menghubungi Anda kembali segera.",
          subject: (code: string) => `Permintaan pengembalian dana diterima — ${code}`,
        }
      : {
          heading: "Got your refund request",
          body: (name: string, code: string, title: string) =>
            `Hi ${name}, we've received your request to refund the gift voucher <strong>${code}</strong> for <strong>${title}</strong>.`,
          notice: "We'll review it and get back to you shortly.",
          subject: (code: string) => `Refund request received — ${code}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.purchaserName), escapeHtml(params.voucherCode), escapeHtml(params.productTitle))}</p>
      <p>${t.notice}</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.voucherCode),
    html,
  });
}

interface GiftVoucherRefundRequestStaffEmailParams {
  toEmail: string;
  purchaserName: string;
  purchaserEmail: string;
  productTitle: string;
  voucherCode: string;
  recipientName: string;
  reason: string;
  reviewUrl: string;
}

/** Internal "someone wants a refund on a gift voucher they bought"
 * notice -- same reasoning as every other new-request staff email in
 * this app. This is the only place staff learn a request came in. */
export async function sendGiftVoucherRefundRequestStaffEmail(
  params: GiftVoucherRefundRequestStaffEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Gift voucher refund request</h1>
      <p><strong>${escapeHtml(params.purchaserName)}</strong> (${escapeHtml(params.purchaserEmail)}) wants to refund voucher <strong>${escapeHtml(params.voucherCode)}</strong> for <strong>${escapeHtml(params.productTitle)}</strong> (bought for ${escapeHtml(params.recipientName)}).</p>
      <p style="color: #4B5854;">"${escapeHtml(params.reason)}"</p>
      <p><a href="${params.reviewUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Review this request</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Gift voucher refund request — ${params.voucherCode}`,
    html,
  });
}

interface GiftVoucherRefundApprovedEmailParams {
  toEmail: string;
  purchaserName: string;
  productTitle: string;
  voucherCode: string;
  refundAmountIdr: number;
  locale: Locale;
}

export async function sendGiftVoucherRefundApprovedEmail(
  params: GiftVoucherRefundApprovedEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Pengembalian dana Anda disetujui",
          body: (name: string, code: string, title: string) =>
            `Hai ${name}, pengembalian dana untuk voucher hadiah <strong>${code}</strong> (${title}) telah disetujui.`,
          refund: (amount: string) =>
            `Jumlah pengembalian dana: <strong>${amount}</strong>. Ini akan diproses ke metode pembayaran asli Anda — mohon tunggu beberapa hari kerja. Voucher itu sendiri tidak lagi berlaku.`,
          subject: (code: string) => `Pengembalian dana disetujui — ${code}`,
        }
      : {
          heading: "Your refund is approved",
          body: (name: string, code: string, title: string) =>
            `Hi ${name}, your refund for gift voucher <strong>${code}</strong> (${title}) has been approved.`,
          refund: (amount: string) =>
            `Refund amount: <strong>${amount}</strong>. This will be processed to your original payment method -- please allow a few business days. The voucher itself is no longer valid.`,
          subject: (code: string) => `Refund approved — ${code}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.purchaserName), escapeHtml(params.voucherCode), escapeHtml(params.productTitle))}</p>
      <p>${t.refund(escapeHtml(formatIdr(params.refundAmountIdr)))}</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.voucherCode),
    html,
  });
}

interface GiftVoucherRefundDeclinedEmailParams {
  toEmail: string;
  purchaserName: string;
  productTitle: string;
  voucherCode: string;
  adminNotes: string | null;
  locale: Locale;
}

export async function sendGiftVoucherRefundDeclinedEmail(
  params: GiftVoucherRefundDeclinedEmailParams
): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: "Permintaan pengembalian dana Anda tidak disetujui",
          body: (name: string, code: string, title: string) =>
            `Hai ${name}, kami tidak dapat menyetujui permintaan pengembalian dana Anda untuk voucher hadiah <strong>${code}</strong> (${title}).`,
          notice: "Voucher masih berlaku dan dapat ditukarkan seperti biasa. Hubungi kami di",
          ifQuestions: "jika Anda memiliki pertanyaan.",
          subject: (code: string) => `Kabar terbaru tentang permintaan pengembalian dana Anda — ${code}`,
        }
      : {
          heading: "Your refund request wasn't approved",
          body: (name: string, code: string, title: string) =>
            `Hi ${name}, we weren't able to approve your refund request for gift voucher <strong>${code}</strong> (${title}).`,
          notice: "The voucher is still valid and can be redeemed as normal. Contact us at",
          ifQuestions: "if you have questions.",
          subject: (code: string) => `Update on your refund request — ${code}`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #B3441E;">${t.heading}</h1>
      <p>${t.body(escapeHtml(params.purchaserName), escapeHtml(params.voucherCode), escapeHtml(params.productTitle))}</p>
      ${params.adminNotes ? `<p style="color: #4B5854;">${escapeHtml(params.adminNotes)}</p>` : ""}
      <p>${t.notice} <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a> ${t.ifQuestions}</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.voucherCode),
    html,
  });
}

interface ReviewRequestEmailParams {
  toEmail: string;
  customerName: string;
  productTitle: string;
  reviewUrl: string;
  locale: Locale;
}

/**
 * Spec §6d/§6g -- sent the day a trip's service_end_date arrives (the
 * daily cron at /api/cron/review-requests), one clean button and
 * nothing else competing for the click, per spec's explicit "maximize
 * completion rate" goal. The link itself proves eligibility -- no
 * login required.
 */
export async function sendReviewRequestEmail(params: ReviewRequestEmailParams): Promise<void> {
  const t =
    params.locale === "id"
      ? {
          heading: (title: string) => `Bagaimana ${title} Anda?`,
          greeting: (name: string) => `Hai ${name},`,
          body: "Kami harap Anda menikmati waktu yang menyenangkan. Boleh berbagi ulasan singkat? Ini sungguh membantu wisatawan lain — dan hanya butuh kurang dari semenit.",
          button: "Tulis ulasan Anda",
          notice: "Tautan ini khusus untuk Anda dan kedaluwarsa dalam 30 hari.",
          subject: (title: string) => `Bagaimana ${title} Anda?`,
        }
      : {
          heading: (title: string) => `How was your ${title}?`,
          greeting: (name: string) => `Hi ${name},`,
          body: "We hope you had a great time. Mind sharing a quick review? It genuinely helps other travelers -- and takes less than a minute.",
          button: "Write your review",
          notice: "This link is just for you and expires in 30 days.",
          subject: (title: string) => `How was your ${title}?`,
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">${t.heading(escapeHtml(params.productTitle))}</h1>
      <p>${t.greeting(escapeHtml(params.customerName))}</p>
      <p>${t.body}</p>
      <p><a href="${params.reviewUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${t.button}</a></p>
      <p style="color: #4B5854; font-size: 13px;">${t.notice}</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: t.subject(params.productTitle),
    html,
  });
}

interface AdminNewReviewEmailParams {
  toEmail: string;
  productTitle: string;
  customerName: string;
  rating: number;
  reviewTitle: string | null;
  reviewBody: string | null;
  /** true once it's already live on the product page (4-5 stars,
   * auto-published); false while it's held for moderation (3 stars or
   * below) -- changes both the wording and which button/link shows. */
  published: boolean;
  reviewUrl: string;
}

/**
 * Mirrors the GetYourGuide format spec §6g asks for directly: subject
 * names the product, the review itself shows inline in the email (not
 * just "you have a new review, click to see it"), one button. The
 * held (3-and-below) version is the one that actually needs to
 * interrupt someone -- worded to make that clear.
 */
export async function sendAdminNewReviewEmail(params: AdminNewReviewEmailParams): Promise<void> {
  const stars = "★".repeat(params.rating) + "☆".repeat(5 - params.rating);
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: ${params.published ? "#0F3A3D" : "#B3441E"};">
        ${params.published ? "New review" : "New review needs a decision"} — ${escapeHtml(params.productTitle)}
      </h1>
      <p style="color: #4B5854;">From ${escapeHtml(params.customerName)}</p>
      <p style="font-size: 20px; letter-spacing: 2px; color: #E1613C;">${stars}</p>
      ${params.reviewTitle ? `<p style="font-weight: 600;">${escapeHtml(params.reviewTitle)}</p>` : ""}
      ${params.reviewBody ? `<p style="color: #1A231F; word-break: break-word;">${escapeHtml(params.reviewBody)}</p>` : ""}
      ${
        params.published
          ? ""
          : `<p style="color: #B3441E;">3 stars or below holds for review before it goes public.</p>`
      }
      <p><a href="${params.reviewUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">${params.published ? "View review" : "Review & moderate"}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `${params.published ? "New review" : "New review needs a decision"} — ${params.productTitle}`,
    html,
  });
}

interface ErrorAlertEmailParams {
  toEmail: string;
  source: "server" | "client";
  message: string;
  routePath?: string | null;
  routeType?: string | null;
  /** How many times this exact error has now happened (see
   * error_alerts.occurrence_count) -- lets an admin tell "just
   * happened once" apart from "been happening for a while and I'm
   * only now hearing about it" (the cooldown in
   * src/lib/alerts/errorAlerts.ts throttles the emails, not the
   * count). */
  occurrenceCount: number;
  siteUrl: string;
}

/**
 * Spec's "find out from an email, not from a customer" error alert --
 * see src/lib/alerts/errorAlerts.ts for the throttling/dedup this is
 * called from. Deliberately plain and technical (this is a bug report
 * for the person fixing the bug, not a customer-facing email) rather
 * than styled like the rest of this file's templates.
 */
export async function sendErrorAlertEmail(params: ErrorAlertEmailParams): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h1 style="color: #B3441E;">⚠️ Something broke on the site</h1>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Where</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.routePath ?? "unknown page")}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Type</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.source)}${params.routeType ? ` / ${escapeHtml(params.routeType)}` : ""}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Happened</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${params.occurrenceCount} time${params.occurrenceCount === 1 ? "" : "s"} so far</td></tr>
      </table>
      <p style="color: #4B5854;">Error message:</p>
      <pre style="background: #F5F1EA; padding: 12px; border-radius: 8px; white-space: pre-wrap; word-break: break-word; font-size: 13px; color: #1A231F;">${escapeHtml(params.message)}</pre>
      <p style="color: #4B5854; font-size: 13px;">You won't get another email about this exact error for a while even if it keeps happening -- this just stops your inbox from being flooded by the same bug.</p>
      <p><a href="${params.siteUrl}" style="color: #1E7A73;">${params.siteUrl}</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `⚠️ Site error — ${params.routePath ?? "unknown page"}`,
    html,
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
