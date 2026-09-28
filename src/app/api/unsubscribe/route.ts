import { NextResponse, type NextRequest } from "next/server";
import { doUnsubscribe } from "@/lib/gate-actions";

/* The one-click target named in the List-Unsubscribe-Post header
   (RFC 8058). Gmail and Yahoo POST here when someone presses their
   built-in Unsubscribe button; there's no page to show, just a status.
   The footer link in the email still goes to /unsubscribe, which is
   the human-facing version of the same thing. */
export async function POST(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) return new NextResponse(null, { status: 400 });
  const done = await doUnsubscribe(email);
  return new NextResponse(null, { status: done.ok ? 200 : 500 });
}
