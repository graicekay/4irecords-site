/* ============================================================
   Outbound destinations, in one place.

   4iproductions.com has no DNS yet, so the visuals hand-off can't
   point at the real intake form. `PRODUCTIONS_INTAKE_URL` is the
   single line to change when that site ships — until then it falls
   back to emailing, which is worse than the intake flow but better
   than a dead link.
   ============================================================ */

export const PRODUCTIONS_SITE = process.env.NEXT_PUBLIC_PRODUCTIONS_URL ?? null;

export const PRODUCTIONS_INTAKE_URL =
  PRODUCTIONS_SITE ? `${PRODUCTIONS_SITE}/#intake` : "mailto:info@4irecords.com?subject=Visuals%20inquiry";

export const PRODUCTIONS_LIVE = PRODUCTIONS_SITE !== null;

export const INSTAGRAM = "https://instagram.com/4irecords";
export const CONTACT_EMAIL = "info@4irecords.com";
