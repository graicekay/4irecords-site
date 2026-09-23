/**
 * Forward an inquiry to invoiCE, where the one queue lives.
 *
 * Best-effort and after the local write: the site's own copy is the record,
 * and a slow or missing invoiCE must never turn a visitor's submit into an
 * error. Failures are logged and swallowed.
 */
export function forwardToInvoice(payload: {
  externalId: string;
  kind?: string | null;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  summary: string;
  details?: Record<string, unknown> | null;
  receivedAt?: string;
}): void {
  const url = process.env.INVOICE_INGEST_URL;
  const secret = process.env.INVOICE_INGEST_SECRET;
  if (!url || !secret) return;
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ingest-secret": secret },
    body: JSON.stringify({ source: "4irecords", ...payload }),
  })
    .then((r) => {
      if (!r.ok) console.error("[inquire] invoiCE forward refused:", r.status);
    })
    .catch((e) => console.error("[inquire] invoiCE forward failed:", e));
}
