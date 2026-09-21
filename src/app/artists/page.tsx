import type { Metadata } from "next";
import InquireForm from "@/components/InquireForm";

export const metadata: Metadata = {
  title: "4 Artists",
  description:
    "4i Records connects artists with resources to create and promote their music without hefty fees, hidden cuts, or creative interference.",
};

/* 4 Artists. The old page ran "What we do", then a Google Form, then
   an "Other artists" note pointing at info@. Same three beats, with
   the form now native and carrying a `kind` field so filmmakers and
   marketers land in the same queue instead of an inbox. */
export default function Artists() {
  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow">4 Artists</p>
        <h1 className="display">What We Do</h1>
        <p className="sub">
          4i Records is an alternative record label that connects artists with
          resources to create and promote their music without hefty fees, hidden
          cuts, or creative interference.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 56 }}>
        <div className="wrap">
          <div className="grid-2">
            <div className="card">
              <p className="eyebrow">Sustainable</p>
              <h3>A business that holds up</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                We help independent musicians build a model that pays, while
                keeping creative control where it belongs.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Uncensored</p>
              <h3>No corporate interference</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                We build community and push for positive change through music,
                and we stand against corporate censorship of it.
              </p>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 26, fontSize: 14 }}>
            Based in Salt Lake City, Utah — and open to remote collaboration.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap narrow">
          <h2 className="display">Inquire below</h2>
          <p className="muted" style={{ marginBottom: 34 }}>
            Tell us what you&apos;re making. We read everything that comes through
            here.
          </p>
          <InquireForm defaultKind="artist" />
        </div>
      </section>

      <section className="section">
        <div className="wrap narrow">
          <h2 className="display">Other artists</h2>
          <p className="muted">
            We&apos;re actively looking for collaborators across disciplines.
            Filmmakers, marketers, and live performance artists — we want to work
            with you. Use the form above, or reach us directly at{" "}
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
