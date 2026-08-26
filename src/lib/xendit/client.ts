import "server-only";

const XENDIT_API_BASE = "https://api.xendit.co";

interface CreateInvoiceParams {
  externalId: string;
  /** Whole IDR amount -- Xendit doesn't use decimal subunits for IDR. */
  amountIdr: number;
  payerEmail: string;
  description: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}

interface XenditInvoice {
  id: string;
  invoice_url: string;
}

/**
 * Creates a Xendit hosted Invoice -- per spec §9, this is deliberately
 * the whole payment UI (card/e-wallet/bank transfer/QRIS method
 * selection all happen on Xendit's own page). We never build a
 * competing payment-method screen or touch card data ourselves; the
 * customer is redirected straight to invoice_url.
 */
export async function createXenditInvoice(params: CreateInvoiceParams): Promise<XenditInvoice> {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) {
    throw new Error("XENDIT_SECRET_KEY is not configured");
  }

  const response = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Xendit uses HTTP Basic Auth with the secret key as the
      // username and an empty password -- not a Bearer token.
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      external_id: params.externalId,
      amount: params.amountIdr,
      currency: "IDR",
      payer_email: params.payerEmail,
      description: params.description,
      success_redirect_url: params.successRedirectUrl,
      failure_redirect_url: params.failureRedirectUrl,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Xendit invoice creation failed (HTTP ${response.status}): ${body}`);
  }

  return (await response.json()) as XenditInvoice;
}
