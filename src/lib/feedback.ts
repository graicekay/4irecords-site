/* ============================================================
   Bug reports and feature requests.

   The same two kinds, wording and subject-line format as the
   feedback forms on 4iproductions.com and in invoICE, so the three
   land in one mailbox looking like one stream rather than three.
   ============================================================ */

export const FEEDBACK_KINDS = ["bug", "feature"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: "Report a bug",
  feature: "Request a feature",
};

/** `site` names which of the three it came from. */
export function feedbackSubject(kind: FeedbackKind, site: string): string {
  return `${kind === "bug" ? "Bug" : "Feature request"} — ${site}`;
}
