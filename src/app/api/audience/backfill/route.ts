import { NextResponse } from "next/server";

import { listContacts } from "@/lib/db";
import { sendAudienceToInvoice } from "@/lib/invoice-forward";

export const dynamic = "force-dynamic";

/** POST /api/audience/backfill — every stored contact, once, into invoiCE. */
export async function POST(req: Request) {
  const secret = process.env.INVOICE_INGEST_SECRET;
  if (!secret || req.headers.get("x-ingest-secret") !== secret)
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const rows = await listContacts();
  let sent = 0;
  const failed: string[] = [];
  for (const c of rows) {
    const ok = await sendAudienceToInvoice({
      email: c.email,
      tags: c.tags,
      origin: c.source,
      unsubscribed: c.unsubscribed,
      subscribedAt: new Date(c.created_at).toISOString(),
    }).catch(() => false);
    if (ok) sent++;
    else failed.push(c.email);
  }
  return NextResponse.json({ total: rows.length, sent, failed });
}
