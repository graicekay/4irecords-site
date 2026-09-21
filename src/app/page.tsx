import Link from "next/link";

/* Home. The copy is the Google Site's copy, near enough verbatim —
   the hero line, the "4i isn't just a label" paragraph, and the 4i
   Underground pitch. What's new is the three-card breakdown, which
   only pulls apart the bullet list the old page ran as prose. */
export default function Home() {
  return (
    <>
      <section className="hero">
        <h1 className="display">
          We&apos;re <span className="four">4</span> Artists.
        </h1>
        <p className="sub">
          An alternative record label in Salt Lake City. No hefty fees, no hidden
          cuts, no creative interference.
        </p>
        <div className="cta">
          <Link href="/inquire" className="btn btn-solid">Inquire</Link>
          <Link href="/events" className="btn">Upcoming shows</Link>
        </div>
        <div className="cue" aria-hidden="true">↓</div>
      </section>

      <section className="section">
        <div className="wrap center">
          <h2 className="display">4i isn&apos;t just a label.</h2>
          <p className="lede">
            We&apos;re a community. We believe artists deserve ownership, and connect
            them with opportunities to sustain their careers. Every artist keeps
            100% of their masters and music, and gains access to a network of
            resources that propels their growth trajectory.
          </p>
          <div style={{ marginTop: 34 }}>
            <Link href="/mission" className="btn">Read our mission statement</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="grid-3">
            <div className="card">
              <p className="eyebrow">Ownership</p>
              <h3>You keep your masters</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                All of them. We take a percentage of what you earn rather than a
                fee up front, so we only do well when you do.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Resources</p>
              <h3>Brand and content support</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                Brand development, content strategy, production, and music video
                support — the things that are hard to buy alone.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Stages</p>
              <h3>Somewhere to play</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                Live performance opportunities through 4i Underground, built so
                the money ends up with the people on stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap center">
          <h2 className="display" style={{ color: "var(--accent)" }}>4i Underground</h2>
          <p className="lede">
            We find the best underground artists and the most dedicated music
            fans. Packed into basements, garages, or your local neighborhood,
            artists <em>always</em> keep the majority of profits. No hefty venue
            fees, no expensive tickets. It&apos;s a win for musicians <em>and</em>{" "}
            show-goers. Join us!
          </p>
          <div style={{ marginTop: 34 }}>
            <Link href="/events" className="btn btn-solid">See upcoming events</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap center">
          <h2 className="display">
            4 Artists. 4 Fans. 4 <span className="four">Good</span>.
          </h2>
          <p className="lede muted">
            Whether you make the music or just can&apos;t live without it, there&apos;s
            a way in.
          </p>
          <div className="cta" style={{ justifyContent: "center", marginTop: 34 }}>
            <Link href="/artists" className="btn">I&apos;m an artist</Link>
            <Link href="/fans" className="btn">I&apos;m a fan</Link>
          </div>
        </div>
      </section>
    </>
  );
}
