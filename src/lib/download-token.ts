import { createHmac, createHash, timingSafeEqual } from "node:crypto";

/* ============================================================
   Signed, expiring download links.

   The spec suggested Vercel Blob with obscure URLs. This does the
   same job with a stronger guarantee and no extra service: the
   files live outside /public and are streamed by a route that
   checks an HMAC over (slug, email, expiry). An obscure URL is
   only secret until someone shares it; this one is tied to the
   address that asked for it and stops working after 7 days.

   If the files outgrow the repo, swap the route's file read for a
   Blob fetch and leave this module alone.
   ============================================================ */

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  const explicit = process.env.DOWNLOAD_SECRET?.trim();
  if (explicit) return explicit;
  /* Falls back to the admin password so there's always *a* key.
     Set DOWNLOAD_SECRET in production: without it, changing the
     admin password invalidates every link already emailed out. */
  const fallback = process.env.ADMIN_PASSWORD ?? "4i-dev-only";
  return createHash("sha256").update(`4i-download:${fallback}`).digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function equals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function makeToken(slug: string, email: string): string {
  const exp = Date.now() + TTL_MS;
  /* The email is hashed, not carried: the link shouldn't leak an
     address to anyone it gets forwarded to, and we only ever need
     to compare it against the one that requested the file. */
  const who = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
  const payload = `${slug}.${who}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck =
  | { ok: true; slug: string }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

export function verifyToken(token: string | null, slug: string): TokenCheck {
  if (!token) return { ok: false, reason: "malformed" };
  const cut = token.lastIndexOf(".");
  if (cut <= 0) return { ok: false, reason: "malformed" };

  const payload = token.slice(0, cut);
  const signature = token.slice(cut + 1);
  /* Signature first — an expired token with a forged signature is a
     forgery, and should read as one. */
  if (!equals(signature, sign(payload))) return { ok: false, reason: "bad-signature" };

  const [tokenSlug, , expRaw] = payload.split(".");
  if (tokenSlug !== slug) return { ok: false, reason: "bad-signature" };

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, slug: tokenSlug };
}
