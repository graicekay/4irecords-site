/* ============================================================
   Pay-what-you-want on the free packs, Gumroad style: a "$ 0+" box
   in the download gate. Nothing is ever required: the file is sent
   by email first, and only then does a non-zero amount open a Stripe
   Checkout for it.

   Same Stripe account as invoiCE. Its webhook only acts on sessions
   and payments tied to its own invoices, so these are ignored there;
   the `source` metadata marks them in the dashboard.

   Plain fetch rather than the SDK: this is the only Stripe call on
   the site.
   ============================================================ */

/* Stripe's floor for a USD charge is $0.50; the ceiling is a typo guard. */
export const MIN_CENTS = 50;
export const MAX_CENTS = 100_000;

export function donationsEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/* "", "0", "$0" all mean free. Returns cents, 0, or null for junk. */
export function parseAmount(raw: string | null | undefined): number | null {
  const text = (raw ?? "").replace(/[$,\s]/g, "");
  if (text === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

export async function createDonationCheckout(opts: {
  cents: number;
  title: string;
  slug: string;
  email: string;
  base: string;
}): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;

  const back = `${opts.base}/resources/${opts.slug}`;
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${back}?thanks=1`,
    cancel_url: back,
    customer_email: opts.email,
    submit_type: "pay",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(opts.cents),
    /* One product name per pack, so the dashboard shows which pack a
       donation came from. */
    "line_items[0][price_data][product_data][name]": opts.title,
    "metadata[source]": "4irecords-resource",
    "metadata[slug]": opts.slug,
    "payment_intent_data[metadata][source]": "4irecords-resource",
    "payment_intent_data[metadata][slug]": opts.slug,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    console.error("[4i] donation checkout failed:", res.status, await res.text());
    return null;
  }
  const session = (await res.json()) as { url?: string };
  return session.url ?? null;
}
