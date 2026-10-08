import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { PostHog } from "posthog-node";

/* ============================================================
   Stripe → PostHog, for the fair-price box (tracking push R3).

   Stripe calls this on checkout.session.completed; a paid session
   that lib/donation.ts created (metadata.source = 4irecords-resource)
   becomes one resource_fair_price_completed event, under the PostHog
   person whose ids the checkout carried. Everything else on the
   account (invoiCE's invoices share it) is acknowledged and ignored.

   The signature is checked by hand, like donation.ts calls Stripe
   by hand: one HMAC isn't worth the SDK.
   ============================================================ */

export const runtime = "nodejs";

const SOURCE = "4irecords-resource";
/* Stripe's own default tolerance for replayed signatures. */
const TOLERANCE_S = 300;

function verify(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=", 2) as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_S) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return signatures.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/* Stripe retries deliveries; a UUID derived from the session id makes a
   retried capture the same event, which PostHog de-duplicates. */
function eventUuid(checkoutId: string): string {
  const h = createHash("sha256").update(`resource_fair_price_completed:${checkoutId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

type CheckoutSession = {
  id: string;
  amount_total: number | null;
  currency: string | null;
  payment_status: string;
  metadata: Record<string, string> | null;
};

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[4i] stripe webhook: STRIPE_WEBHOOK_SECRET is not set");
    return new NextResponse("Webhook not configured.", { status: 503 });
  }

  const payload = await request.text();
  if (!verify(payload, request.headers.get("stripe-signature"), secret)) {
    return new NextResponse("Bad signature.", { status: 400 });
  }

  let event: { type?: string; data?: { object?: CheckoutSession } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new NextResponse("Bad payload.", { status: 400 });
  }

  const session = event.data?.object;
  if (
    event.type !== "checkout.session.completed"
    || !session
    || session.metadata?.source !== SOURCE
    || session.payment_status !== "paid"
  ) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) {
    console.error("[4i] stripe webhook: PostHog env missing, payment not captured:", session.id);
    return NextResponse.json({ received: true, captured: false });
  }

  const meta = session.metadata ?? {};
  const distinctId = meta.ph_distinct_id;
  const posthog = new PostHog(token, { host, flushAt: 1, flushInterval: 0 });
  try {
    posthog.capture({
      /* No id means the browser had no PostHog (blocked, or env missing):
         still count the payment, without making a person for it. */
      distinctId: distinctId || `stripe:${session.id}`,
      event: "resource_fair_price_completed",
      uuid: eventUuid(session.id),
      properties: {
        resource_slug: meta.slug ?? null,
        guide_name: meta.guide_name ?? null,
        amount_usd: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "usd",
        provider: "stripe",
        checkout_id: session.id,
        site: "4irecords",
        $host: "www.4irecords.com",
        ...(meta.ph_session_id ? { $session_id: meta.ph_session_id } : {}),
        ...(distinctId ? {} : { $process_person_profile: false }),
      },
    });
    await posthog.shutdown();
  } catch (error) {
    /* A 500 makes Stripe retry, and the uuid keeps a retry from doubling. */
    console.error("[4i] stripe webhook: PostHog capture failed:", error);
    return new NextResponse("Capture failed.", { status: 500 });
  }

  return NextResponse.json({ received: true, captured: true });
}
