import Link from "next/link";
import CaseStudy from "@/components/CaseStudy";
import { SpinningRecord } from "@/components/SpinningRecord";
import { FourIMark } from "@/components/FourIMark";
import { caseStudies } from "@/lib/case-studies";
import { FORMAT_LABEL, featuredResources } from "@/lib/resources";

/* ============================================================
   §3.1 — landing page.

   Order of on-page weight follows §1: give away real value first,
   route to visuals second, build the list last.

   The roadmap section and /vision are both gone for now — Grace
   pulled them until the marketplace and events actually exist.
   Nothing here should read as "coming soon".
   ============================================================ */

export default function Home() {
  const featured = featuredResources(3);

  return (
    <>
      <section className="hero">
        <SpinningRecord />
        <h1 className="display">
          A record label that lets artists be their own record label.
        </h1>
        <p className="sub">
          4i Records is building the infrastructure independent artists
          don&apos;t have.
        </p>
        <div className="cta">
          <Link href="/resources" className="btn btn-solid">Get the free resources</Link>
          <Link href="/visuals" className="btn">Get pro visuals</Link>
        </div>
        <div className="cue" aria-hidden="true">↓</div>
      </section>

      <section className="section">
        <div className="wrap">
          {/* The mark, not the letters. `.display` uppercases, and Anton
              has no lowercase to fall back on, so a typed "4i" came out as
              "4I" — the dot on the i is not optional. */}
          <h2 className="display">
            What <FourIMark className="inline-mark" /><span className="sr-only">4i</span> is
          </h2>
          <div className="grid-3" style={{ marginTop: 26 }}>
            <div className="card">
              <p className="eyebrow">Ownership</p>
              <h3>You keep 100% of your masters</h3>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                All of them. That isn&apos;t a headline deal term with an
                asterisk — it&apos;s the whole arrangement.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Alignment</p>
              <h3>We don&apos;t make money unless you do</h3>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                A percentage of what you earn, rather than a fee up front. If
                the work doesn&apos;t pay you, it doesn&apos;t pay us.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Selection</p>
              <h3>Purpose over pure commercial</h3>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                We work with artists who are making something they mean, not
                whatever is currently converting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", gap: 16, flexWrap: "wrap",
            }}>
              <h2 className="display" style={{ margin: 0 }}>Free resources</h2>
              <Link href="/resources" className="linkish">All resources →</Link>
            </div>
            <p className="muted" style={{ marginTop: 14 }}>
              The full PDFs and spreadsheet trackers go straight to your email.
            </p>
            <div className="grid-3" style={{ marginTop: 26 }}>
              {featured.map((r) => (
                <Link key={r.slug} href={`/resources/${r.slug}`} className="card">
                  <span className={r.downloadFile ? "badge badge-has-dl" : "badge"}>
                    {FORMAT_LABEL[r.format]}
                  </span>
                  <h3 style={{ marginTop: 14, fontSize: 17 }}>{r.title}</h3>
                  <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                    {r.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">4i Productions</p>
          <h2 className="display" style={{ marginTop: 12 }}>
            When you need it made properly.
          </h2>
          <p className="lede muted">
            Music videos, performance visuals, and the short-form that comes out
            of the same shoot.
          </p>
          {caseStudies.length > 0 && (
            <div
              className={caseStudies.length === 1 ? undefined : "grid-3"}
              style={{ marginTop: 30, maxWidth: caseStudies.length === 1 ? 760 : undefined }}
            >
              {caseStudies.slice(0, 3).map((c) => (
                <CaseStudy key={c.youtubeId} study={c} large={caseStudies.length === 1} />
              ))}
            </div>
          )}
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
            <Link href="/visuals" className="btn btn-solid">See the work</Link>
          </div>
        </div>
      </section>


      <section className="section">
        <div className="wrap center">
          <h2 className="display">
            4 Artists. 4 Fans. 4 <span className="four">Good</span>.
          </h2>
          <p className="lede muted">
            Get new resources when we publish them.
          </p>
          <div className="cta" style={{ justifyContent: "center", marginTop: 30 }}>
            <Link href="/inquire?for=updates" className="btn btn-solid">
              Keep me posted
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
