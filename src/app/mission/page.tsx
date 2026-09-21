import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mission",
  description:
    "Our mission is to empower independent artists to own their voices, their masters, and their futures.",
};

/* Mission. Verbatim from the Google Site — this page is the one
   place the label states its position, so the copy is left alone
   and only the setting changes. */
export default function Mission() {
  return (
    <>
      <section className="wrap page-head">
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
            We provide the tools, networks, and resources that support artists&apos;
            autonomous growth and brand development.
          </p>
          <p className="muted" style={{ marginTop: 22 }}>
            We believe art should connect and uplift, not divide or harm.
            That&apos;s why we champion music that promotes authenticity and
            thoughtfulness for positive impact.
          </p>
          <p className="muted" style={{ marginTop: 22 }}>
            We aim to build a music movement through innovation, honesty, and the
            power of self-expression — one that unifies audiences everywhere.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap center">
          <h2 className="display">
            4 Artists. 4 Fans. 4 <span className="four">Good</span>.
          </h2>
          <div className="cta" style={{ justifyContent: "center", marginTop: 30 }}>
            <Link href="/inquire" className="btn btn-solid">Inquire</Link>
          </div>
        </div>
      </section>
    </>
  );
}
