import { NextResponse } from "next/server";

import { listInquiries } from "@/lib/db";
import { sendToInvoice } from "@/lib/invoice-forward";

export const dynamic = "force-dynamic";

/**
 * POST /api/inquiries/backfill — send every stored inquiry to invoiCE.
 *
 * One-off, for the day the queue moved. Guarded by the same shared secret
 * the forward uses; idempotent on the other end.
 */
export async function POST(req: Request) {
  const secret = process.env.INVOICE_INGEST_SECRET;
  if (!secret || req.headers.get("x-ingest-secret") !== secret)
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const rows = await listInquiries();
  let sent = 0;
  const failed: string[] = [];
  for (const r of rows) {
    const ok = await sendToInvoice({
      externalId: r.id,
      kind: r.kind,
      name: r.name,
      email: r.email,
      summary: r.message ?? "",
      details: {
        role: r.role,
        links: r.links,
        portfolio: r.portfolio,
        availability: r.availability,
        location: r.location,
        siteStatus: r.status,
      },
      receivedAt: new Date(r.created_at).toISOString(),
    }).catch(() => false);
    if (ok) sent++;
    else failed.push(r.id);
  }
  return NextResponse.json({ total: rows.length, sent, failed });
}
