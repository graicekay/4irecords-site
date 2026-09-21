import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/* ============================================================
   Admin gate.

   One shared password, one signed cookie — there is one person
   using /admin and no user table to build. The cookie carries
   nothing but its own expiry and a signature over it, so there
   is no session store to keep and nothing to read out of the
   cookie if it leaks.

   Two env vars, both read at request time (never at module
   load, so a changed .env takes effect on the next request):

     ADMIN_PASSWORD        the password. Required in production.
     ADMIN_SESSION_SECRET  optional. Defaults to a hash of the
                           password, which means changing the
                           password signs every session out.

   With no ADMIN_PASSWORD set, /admin stays open in dev (so the
   dashboard still works on this machine with nothing configured)
   and is refused outright in production. See `adminMode`.
   ============================================================ */

export const SESSION_COOKIE = "4ir_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_VERSION = "v1";

export type AdminMode =
  | { kind: "protected"; password: string }   // password set — gate is live
  | { kind: "open" }                          // dev, no password — open with a banner
  | { kind: "misconfigured" };                // production, no password — refuse everything

export function adminMode(): AdminMode {
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (password) return { kind: "protected", password };
  return process.env.NODE_ENV === "production" ? { kind: "misconfigured" } : { kind: "open" };
}

function secretFor(password: string): string {
  const explicit = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (explicit) return explicit;
  return createHash("sha256").update(`4ir-admin-session:${password}`).digest("hex");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/* Constant-time compare that doesn't leak length through a throw. */
function equals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(supplied: string, password: string): boolean {
  return equals(supplied, password);
}

export function issueSession(password: string): { value: string; maxAge: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${TOKEN_VERSION}.${exp}.${randomUUID()}`;
  return {
    value: `${payload}.${sign(payload, secretFor(password))}`,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/* Verifies signature first, expiry second — an expired token
   with a bad signature is rejected as a forgery either way. */
export function verifySession(token: string | undefined, password: string): boolean {
  if (!token) return false;
  const cut = token.lastIndexOf(".");
  if (cut <= 0) return false;
  const payload = token.slice(0, cut);
  const signature = token.slice(cut + 1);
  if (!equals(signature, sign(payload, secretFor(password)))) return false;

  const [version, expRaw] = payload.split(".");
  if (version !== TOKEN_VERSION) return false;
  const exp = Number(expRaw);
  return Number.isFinite(exp) && exp > Date.now();
}

/* The one question every caller actually asks: may this request
   see /admin? `open` is the dev-only no-password case. */
export function sessionAllows(token: string | undefined, mode: AdminMode = adminMode()): boolean {
  switch (mode.kind) {
    case "open": return true;
    case "misconfigured": return false;
    case "protected": return verifySession(token, mode.password);
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
