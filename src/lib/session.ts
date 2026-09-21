import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, adminMode, sessionAllows, type AdminMode } from "./auth";

/* The cookie-reading half of the gate, kept apart from `auth.ts`
   so that file stays free of next/headers and can be imported by
   `proxy.ts`, which runs outside the render path. */

export async function adminSession(): Promise<{ authed: boolean; mode: AdminMode }> {
  const mode = adminMode();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return { authed: sessionAllows(token, mode), mode };
}

/* Guards a page or a server action. The proxy already redirects
   unauthenticated page requests, but server actions are their own
   POST endpoint and are not covered by it, so every write calls
   this itself. */
export async function requireAdmin(next = "/admin"): Promise<void> {
  const { authed } = await adminSession();
  if (!authed) redirect(`/login?next=${encodeURIComponent(next)}`);
}
