/* ============================================================
   Outbound destinations, in one place.

   4iproductions.com went live on 2026-09-21, so the visuals hand-off
   points at its real intake. 4i Records deliberately does not collect
   visual-project briefs itself — that is 4i Productions' job, and its
   intake asks the questions that actually price the work.

   The env var still wins, for pointing a preview at a preview.
   ============================================================ */

export const PRODUCTIONS_SITE =
  process.env.NEXT_PUBLIC_PRODUCTIONS_URL ?? "https://www.4iproductions.com";

/* `#inquire` is the id on the intake section of the 4i Productions home
   page. It was `#intake` here, which scrolled nowhere. */
export const PRODUCTIONS_INTAKE_URL = `${PRODUCTIONS_SITE}/#inquire`;

/**
 * The intake, with a project type already chosen.
 *
 * These keys are 4i Productions' own (`PROJECT_TYPES` in its lib/spec.ts).
 * Its intake ignores anything it doesn't recognise and just opens on the
 * type question, so a key going stale here degrades rather than breaks —
 * but if that list is edited, edit this one.
 */
export type ProductionsType =
  | "music_video" | "commercial" | "narrative" | "live_show" | "other";

export const productionsIntake = (type: ProductionsType) =>
  `${PRODUCTIONS_SITE}/?type=${type}#inquire`;

export const PRODUCTIONS_LIVE = true;

export const INSTAGRAM = "https://instagram.com/4irecords";
export const CONTACT_EMAIL = "info@4irecords.com";
