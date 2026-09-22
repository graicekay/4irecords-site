import type { Metadata } from "next";

import FeedbackForm from "@/components/FeedbackForm";

/* A utility page for people already on the site, not something that
   should turn up in a search for the label. */
export const metadata: Metadata = {
  title: "Report a bug or request a feature",
  description: "Something broken, or something missing? Tell us.",
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow">Feedback</p>
        <h1 className="display">Report a bug or request a feature</h1>
        <p className="sub">
          Something broken, or something missing? Tell us and it goes straight
          to the people who can fix it.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 48 }}>
        <div className="wrap narrow">
          <FeedbackForm />
          <p className="muted" style={{ fontSize: 13, marginTop: 34 }}>
            Prefer email? We&apos;re at{" "}
            <a href="mailto:info@4irecords.com" style={{ color: "var(--accent)" }}>
              info@4irecords.com
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
