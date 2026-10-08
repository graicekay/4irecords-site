import type { Metadata } from "next";
import Link from "next/link";
import { VisualsSmoke } from "@/components/VisualsSmoke";

export const metadata: Metadata = {
  title: "Mission",
  description:
    "Our mission is to empower independent artists to own their voices, their masters, and their futures.",
};

/* Mission. From the Google Site, revised 8 Oct 2026 when 4i Records
   moved from label to resource hub (not signing artists for now). */
export default function Mission() {
  return (
    <>
      <section className="wrap page-head has-smoke">
        {/* 4i Productions' green smoke, on its own (no video here). */}
        <VisualsSmoke video={false} />
        <p className="eyebrow">Empower Expression</p>
        <h1 className="display">Our Mission</h1>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 48 }}>
        <div className="wrap narrow">
          <p className="lede" style={{ fontSize: 19, lineHeight: 1.65 }}>
            Our mission is to empower independent artists to own their voices,
            their masters, and their futures. We reject corporate censorship and
            encourage experimentation.
          </p>
          <p className="muted" style={{ marginTop: 26 }}>
            We give away the tools, steps and numbers we use ourselves, so
            artists can run their own releases with the resources they have.
          </p>
          <p className="muted" style={{ marginTop: 22 }}>
            We believe art should connect and uplift, not divide or harm. We
            champion music made with authenticity and thoughtfulness.
          </p>
          <p className="muted" style={{ marginTop: 22 }}>
            We&apos;re building a music movement on innovation, honesty and
            self-expression. It starts with the tools.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap center">
          <h2 className="display">
            4 Artists. 4 Fans. 4 <span className="four">Good</span>.
          </h2>
          <div className="cta" style={{ justifyContent: "center", marginTop: 30 }}>
            <Link href="/resources" className="btn btn-solid">Get the free tools</Link>
            <Link
              href="/inquire?for=spotlight" className="btn"
              data-event="spotlight_cta_clicked" data-placement="mission"
            >
              Submit for a Spotlight
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
