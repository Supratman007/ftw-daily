import "server-only";
import { formatIdr, formatUsd } from "@/lib/currency";

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
}

/** Sends the "booking confirmed" email (spec §6g) to the customer. */
export async function sendBookingConfirmedEmail(params: BookingConfirmedEmailParams): Promise<void> {
  const discountRow =
    params.discountCode && params.discountAmountUsd
      ? `<tr><td style="padding: 6px 0; color: #4B5854;">Discount (${escapeHtml(params.discountCode)})</td><td style="padding: 6px 0; text-align: right;">-${formatUsd(params.discountAmountUsd)}</td></tr>`
      : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Booking confirmed</h1>
      <p>Hi ${escapeHtml(params.customerName)},</p>
      <p>Your booking for <strong>${escapeHtml(params.productTitle)}</strong> is confirmed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Booking code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Date</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.slotDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Travelers</td><td style="padding: 6px 0; text-align: right;">${params.paxCount}</td></tr>
        ${discountRow}
        <tr><td style="padding: 6px 0; color: #4B5854;">Total paid</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.totalIdr))}</td></tr>
      </table>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">View your booking</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Booking confirmed — ${params.productTitle}`,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #B3441E;">Payment didn&rsquo;t go through</h1>
      <p>Hi ${escapeHtml(params.customerName)},</p>
      <p>
        Your booking attempt for <strong>${escapeHtml(params.productTitle)}</strong> on
        ${escapeHtml(params.slotDate)} (${escapeHtml(params.bookingCode)}) wasn&rsquo;t completed,
        so nothing was charged.
      </p>
      <p>If you&rsquo;d still like to book, you&rsquo;re welcome to try again.</p>
      <p><a href="${params.productUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Try booking again</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Payment didn't go through — ${params.productTitle}`,
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
}

/**
 * Internal "a new paid booking just came in" notice -- goes to every
 * active admin_users row (spec doesn't yet have narrower roles enforced
 * in Phase 1, see §6k, so everyone active gets it for now) so someone
 * knows to start preparing the trip. Separate from the customer email
 * above so one failing never affects the other.
 */
export async function sendNewBookingStaffEmail(params: NewBookingStaffEmailParams): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New booking paid</h1>
      <p><strong>${escapeHtml(params.productTitle)}</strong> was just booked and paid for.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Booking code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Date</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(params.slotDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Travelers</td><td style="padding: 6px 0; text-align: right;">${params.paxCount}</td></tr>
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
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Request received</h1>
      <p>Hi ${escapeHtml(params.customerName)}, we've received your booking request for <strong>${escapeHtml(params.productTitle)}</strong> on ${escapeHtml(params.slotDate)}.</p>
      <p>Nothing has been charged yet. This trip needs us to manually check park permit availability before we can confirm -- we'll email you as soon as we know, usually within a day or two.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Booking code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
      </table>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Request received — ${params.productTitle}`,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">You're confirmed — complete payment to secure your spot</h1>
      <p>Hi ${escapeHtml(params.customerName)}, good news: park permits are available for <strong>${escapeHtml(params.productTitle)}</strong> on ${escapeHtml(params.slotDate)}.</p>
      <p>Complete payment within <strong>24 hours</strong> to lock in your spot -- after that, it's released back to general availability.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Booking code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.bookingCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Total</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.totalIdr))}</td></tr>
      </table>
      <p><a href="${params.paymentUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Complete payment</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Confirmed — complete payment for ${params.productTitle}`,
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
}

/** Sent when park quota isn't available -- nothing was ever charged
 * (no invoice exists yet at this point in the flow), so this is purely
 * informational, with the reason shown per spec §6b so a customer
 * knows whether trying a different date is worth it. */
export async function sendBookingRequestDeclinedEmail(
  params: BookingRequestDeclinedEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #B3441E;">We couldn't confirm this request</h1>
      <p>Hi ${escapeHtml(params.customerName)}, unfortunately we couldn't confirm <strong>${escapeHtml(params.productTitle)}</strong> on ${escapeHtml(params.slotDate)} (${escapeHtml(params.bookingCode)}).</p>
      <p style="color: #4B5854;">${escapeHtml(params.declineReason)}</p>
      <p>Nothing was charged. You're welcome to request a different date.</p>
      <p><a href="${params.productUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Try another date</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Couldn't confirm — ${params.productTitle}`,
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
