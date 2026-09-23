/**
 * Forward an inquiry to invoiCE, where the one queue lives.
 *
 * Best-effort and after the local write: the site's own copy is the record,
 * and a slow or missing invoiCE must never turn a visitor's submit into an
 * error. Failures are logged and swallowed.
 */

const SOURCE = "4irecords";

export type ForwardPayload = {
  externalId: string;
  kind?: string | null;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  summary: string;
  details?: Record<string, unknown> | null;
  receivedAt?: string;
};

/** Send one inquiry and say whether invoiCE took it. */
export async function sendToInvoice(payload: ForwardPayload): Promise<boolean> {
  const url = process.env.INVOICE_INGEST_URL;
  const secret = process.env.INVOICE_INGEST_SECRET;
  if (!url || !secret) return false;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ingest-secret": secret },
    body: JSON.stringify({ source: SOURCE, ...payload }),
  });
  return r.ok;
}

/** Fire-and-forget, for the submit path: never slows or fails a visitor. */
export function forwardToInvoice(payload: ForwardPayload): void {
  void sendToInvoice(payload)
    .then((ok) => {
      if (!ok) console.error("[inquire] invoiCE forward refused");
    })
    .catch((e) => console.error("[inquire] invoiCE forward failed:", e));
}

export type AudiencePayload = {
  email: string;
  name?: string | null;
  tags: string[];
  origin?: string | null;
  unsubscribed?: boolean;
  subscribedAt?: string;
};

/** The audience endpoint sits beside the inquiries one. */
function audienceUrl(): string | null {
  const url = process.env.INVOICE_INGEST_URL;
  return url ? url.replace(/\/inquiries\/ingest$/, "/audience/ingest") : null;
}

/** Send one sign-up to invoiCE's audience; say whether it took. */
export async function sendAudienceToInvoice(payload: AudiencePayload): Promise<boolean> {
  const url = audienceUrl();
  const secret = process.env.INVOICE_INGEST_SECRET;
  if (!url || !secret) return false;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ingest-secret": secret },
    body: JSON.stringify({ source: SOURCE, ...payload }),
  });
  return r.ok;
}

/** Fire-and-forget, for the sign-up path. */
export function forwardAudience(payload: AudiencePayload): void {
  void sendAudienceToInvoice(payload)
    .then((ok) => {
      if (!ok) console.error("[audience] invoiCE forward refused");
    })
    .catch((e) => console.error("[audience] invoiCE forward failed:", e));
}
