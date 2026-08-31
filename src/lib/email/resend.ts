import "server-only";
import { formatIdr, formatUsd } from "@/lib/currency";
import { SUPPORT_EMAIL, WHATSAPP_NUMBER, whatsappLink } from "@/lib/contact";

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

interface NewStaffReplyEmailParams {
  toEmail: string;
  recipientName: string;
  contextLabel: string;
  messageBody: string;
  threadUrl: string;
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
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">New reply</h1>
      <p>Hi ${escapeHtml(params.recipientName)}, you have a new message about ${escapeHtml(params.contextLabel)}:</p>
      <p style="border-left: 3px solid #E1613C; padding-left: 12px; color: #182421;">${escapeHtml(params.messageBody)}</p>
      <p><a href="${params.threadUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Reply</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `New reply — ${params.contextLabel}`,
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
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Request received</h1>
      <p>Hi ${escapeHtml(params.customerName)}, we've received your ${
        params.path === "force_majeure" ? "force majeure" : "cancellation"
      } request for <strong>${escapeHtml(params.productTitle)}</strong> (${escapeHtml(params.bookingCode)}).</p>
      ${
        params.calculatedRefundIdr != null
          ? `<p>Based on our cancellation policy, your calculated refund is <strong>${escapeHtml(formatIdr(params.calculatedRefundIdr))}</strong>. A staff member will review and confirm before anything is refunded.</p>`
          : `<p>A staff member will review your supporting documentation and get back to you.</p>`
      }
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">View your booking</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Request received — ${params.productTitle}`,
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
}

export async function sendCancellationApprovedRefundEmail(
  params: CancellationApprovedRefundEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Your cancellation is approved</h1>
      <p>Hi ${escapeHtml(params.customerName)}, your cancellation for <strong>${escapeHtml(params.productTitle)}</strong> (${escapeHtml(params.bookingCode)}) has been approved.</p>
      <p>Refund amount: <strong>${escapeHtml(formatIdr(params.refundAmountIdr))}</strong>. This will be processed to your original payment method -- please allow a few business days.</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">View your booking</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Cancellation approved — ${params.productTitle}`,
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
}

export async function sendCancellationApprovedRescheduleEmail(
  params: CancellationApprovedRescheduleEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">You're rescheduled</h1>
      <p>Hi ${escapeHtml(params.customerName)}, your request to reschedule <strong>${escapeHtml(params.productTitle)}</strong> (${escapeHtml(params.bookingCode)}) has been approved -- no fee.</p>
      <p>New date: <strong>${escapeHtml(params.newSlotDate)}</strong>.</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">View your booking</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Rescheduled — ${params.productTitle}`,
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
  const waLink = whatsappLink(`Hi, I'd like to redeem gift voucher ${params.voucherCode}`);
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Your gift voucher is ready</h1>
      <p>Hi ${escapeHtml(params.customerName)}, your request for <strong>${escapeHtml(params.productTitle)}</strong> (${escapeHtml(params.bookingCode)}) has been converted into a gift voucher for ${escapeHtml(params.recipientName)}.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #4B5854;">Voucher code</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(params.voucherCode)}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Value</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${escapeHtml(formatIdr(params.valueIdr))}</td></tr>
        <tr><td style="padding: 6px 0; color: #4B5854;">Expires</td><td style="padding: 6px 0; text-align: right;">${escapeHtml(new Date(params.expiresAt).toLocaleDateString())}</td></tr>
      </table>
      <p>Please forward this email or share the code above with ${escapeHtml(params.recipientName)}. When they're ready to book, here's exactly what they should do:</p>
      <p><a href="${params.redeemUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Redeem this voucher</a></p>
      <p style="color: #4B5854; font-size: 14px;">
        That page walks them through submitting their details and preferred date. If they'd rather reach us directly: email
        <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a> quoting the voucher code${
          waLink ? ` or WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>` : ""
        }.
      </p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">View your booking</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Your gift voucher — ${params.voucherCode}`,
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
function contactChannelsHtml(opts: { voucherCode: string; signupEmail?: string }): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const waLink = whatsappLink(`Hi, I'm asking about gift voucher ${opts.voucherCode}`);
  // Lands them back on their own voucher's page post-signup (it'll show
  // their request is already on file) instead of the bare homepage.
  const returnTo = `/redeem?code=${encodeURIComponent(opts.voucherCode)}`;
  const signupHref = opts.signupEmail
    ? `${siteUrl}/login?mode=signup&email=${encodeURIComponent(opts.signupEmail)}&return_to=${encodeURIComponent(returnTo)}`
    : `${siteUrl}/login?mode=signup&return_to=${encodeURIComponent(returnTo)}`;
  return `
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4DFD4;">
      <p style="font-weight: 600; color: #0F3A3D;">Ways to reach us</p>
      <ul style="padding-left: 18px; color: #4B5854;">
        <li><a href="${signupHref}" style="color: #1E7A73;">Create a free account</a> -- once you have one, you can message us any time from your trip's page in the app.</li>
        <li>Email <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a> quoting voucher ${escapeHtml(opts.voucherCode)}.</li>
        ${
          waLink
            ? `<li>WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>.</li>`
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
}

/** Confirms to whoever just submitted the /redeem form that it went
 * through -- they have no account and no booking page to check, so
 * this email is the only receipt they get. Points them at every way to
 * reach us right away, rather than leaving them to wait and wonder. */
export async function sendVoucherRedemptionReceivedEmail(
  params: VoucherRedemptionReceivedEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Got your redemption request</h1>
      <p>Hi ${escapeHtml(params.recipientName)}, we've received your request to redeem voucher <strong>${escapeHtml(params.voucherCode)}</strong> for <strong>${escapeHtml(params.productTitle)}</strong>.</p>
      <p>We'll be in touch shortly to confirm your date and the trip details.</p>
      ${contactChannelsHtml({ voucherCode: params.voucherCode, signupEmail: params.toEmail })}
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Redemption request received — ${params.voucherCode}`,
    html,
  });
}

interface VoucherRedeemedNeedsAccountEmailParams {
  toEmail: string;
  recipientName: string;
  productTitle: string;
  voucherCode: string;
}

/** Sent when staff try to confirm a redemption but no account exists
 * yet under the email the recipient gave us -- a booking can only ever
 * belong to a real account, so this is the one thing standing between
 * them and a trip they can see and message us about. */
export async function sendVoucherRedeemedNeedsAccountEmail(
  params: VoucherRedeemedNeedsAccountEmailParams
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const returnTo = `/redeem?code=${encodeURIComponent(params.voucherCode)}`;
  const signupHref = `${siteUrl}/login?mode=signup&email=${encodeURIComponent(params.toEmail)}&return_to=${encodeURIComponent(returnTo)}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">One more step for ${escapeHtml(params.productTitle)}</h1>
      <p>Hi ${escapeHtml(params.recipientName)}, we're ready to confirm your trip -- we just need you to create a free account first, using this same email address (${escapeHtml(params.toEmail)}). That's what lets us attach your trip to your account so you can see it and message us any time.</p>
      <p><a href="${signupHref}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Create your account</a></p>
      <p style="color: #4B5854;">You'll land back on your voucher page once you're signed up -- no need to do anything else, we'll confirm your trip from our end shortly after.</p>
      <p style="color: #4B5854;">In a hurry? Email <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a>
        ${(() => {
          const waLink = whatsappLink(`Hi, I'm setting up my account to redeem a gift voucher`);
          return waLink ? ` or WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>` : "";
        })()}.
      </p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Almost there — create your account to confirm your trip`,
    html,
  });
}

interface VoucherRedeemedBookingConfirmedEmailParams {
  toEmail: string;
  recipientName: string;
  productTitle: string;
  slotDate: string;
  bookingUrl: string;
}

/** The actual "you're all set" moment -- a real booking now exists
 * under their account, so this links straight to it (chat panel and
 * all) instead of repeating the generic contact channels. */
export async function sendVoucherRedeemedBookingConfirmedEmail(
  params: VoucherRedeemedBookingConfirmedEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">You're all set!</h1>
      <p>Hi ${escapeHtml(params.recipientName)}, your gift trip is confirmed: <strong>${escapeHtml(params.productTitle)}</strong> on <strong>${escapeHtml(params.slotDate)}</strong>. No further payment needed -- it's already covered by the voucher.</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">View your trip</a></p>
      <p style="color: #4B5854;">You can message us any time from that page -- pickup point, hotel details, anything at all. Questions right now?
        Email <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #1E7A73;">${escapeHtml(SUPPORT_EMAIL)}</a>
        ${(() => {
          const waLink = whatsappLink(`Hi, I have a question about my trip: ${params.productTitle}`);
          return waLink ? ` or WhatsApp us at <a href="${waLink}" style="color: #1E7A73;">${escapeHtml(WHATSAPP_NUMBER ?? "")}</a>` : "";
        })()}.
      </p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `You're all set — ${params.productTitle}`,
    html,
  });
}

interface GiftVoucherRedeemedNotifyGiverEmailParams {
  toEmail: string;
  giverName: string;
  recipientName: string;
  productTitle: string;
  slotDate: string;
}

/** The person who originally converted their trip into a gift voucher
 * otherwise never hears anything again -- every other email in this
 * flow goes to the recipient. Sent once redemption is confirmed, so
 * they know their gift actually reached someone and got used. */
export async function sendGiftVoucherRedeemedNotifyGiverEmail(
  params: GiftVoucherRedeemedNotifyGiverEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0F3A3D;">Your gift was redeemed!</h1>
      <p>Hi ${escapeHtml(params.giverName)}, good news -- ${escapeHtml(params.recipientName)} just redeemed the gift voucher you set up for <strong>${escapeHtml(params.productTitle)}</strong>. Their trip is confirmed for <strong>${escapeHtml(params.slotDate)}</strong>.</p>
      <p style="color: #4B5854;">That's it -- nothing further needed from you. Thanks for thinking of them!</p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Your gift was redeemed — ${params.productTitle}`,
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
}

export async function sendCancellationRejectedEmail(
  params: CancellationRejectedEmailParams
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #B3441E;">Your request wasn't approved</h1>
      <p>Hi ${escapeHtml(params.customerName)}, we weren't able to approve your cancellation/reschedule request for <strong>${escapeHtml(params.productTitle)}</strong> (${escapeHtml(params.bookingCode)}).</p>
      ${params.adminNotes ? `<p style="color: #4B5854;">${escapeHtml(params.adminNotes)}</p>` : ""}
      <p>Contact us if you have questions -- message us any time from your booking page.</p>
      <p><a href="${params.bookingUrl}" style="display: inline-block; background: #E1613C; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">View your booking</a></p>
    </div>
  `;

  await sendEmail({
    to: params.toEmail,
    subject: `Update on your request — ${params.productTitle}`,
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
