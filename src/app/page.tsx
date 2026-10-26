import type { Metadata } from "next";
import Link from "next/link";
import CaseStudy from "@/components/CaseStudy";
import { SpinningRecord } from "@/components/SpinningRecord";
import { ScrollCue } from "@/components/ScrollCue";
import { FourIText, FourILower } from "@/components/FourIMark";
import { caseStudies } from "@/lib/case-studies";
import { featuredResources } from "@/lib/resources";
import { ResourceCard } from "@/components/ResourceCard";
import { Stickers } from "@/components/Stickers";
import { HERO_STICKERS } from "@/lib/stickers";
import { PluginPromo } from "@/components/PluginPromo";
import { PRODUCTIONS_SITE } from "@/lib/links";

/* One main address for the home page, so ?fbclid= and other tracking
   variants count as the same page in Google. */
export const metadata: Metadata = { alternates: { canonical: "/" } };

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
        <Stickers items={HERO_STICKERS} />
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
        <ScrollCue />
      </section>

      <section className="section tight">
        <div className="wrap">
          {/* The mark, not the letters. `.display` uppercases, and Anton
              has no lowercase to fall back on, so a typed "4i" came out as
              "4I" — the dot on the i is not optional. */}
          <h2 className="display">
            What <FourIText /> is
          </h2>
          <div className="grid-3" style={{ marginTop: 26 }}>
            <div className="card">
              <p className="eyebrow">Tools</p>
              <h3>The real tools, free.</h3>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                The checklists, trackers and breakdowns we use on our own
                releases. Not a sample of a paid version. The actual files.
                Name a fair price if they helped.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Ownership</p>
              <h3>Know what you own.</h3>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                Masters, publishing, splits, royalties: what&apos;s yours, and
                how to collect it. In plain English, before anyone else
                explains it to you.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Purpose</p>
              <h3>Purpose over pure commercial.</h3>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                We spotlight Salt Lake artists making something they mean, not
                whatever is currently converting. Then we let the work talk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SLC Artist Spotlight. Fit with 4i's values is the bar (Grace, 8 Oct):
          no guarantee, and we reach out only if it's a good fit. */}
      <section className="section tight">
        <div className="wrap spotlight">
          <div>
          <p className="eyebrow">Salt Lake City</p>
          <h2 className="display" style={{ marginTop: 12 }}>SLC Artist Spotlight</h2>
          <p className="lede muted">
            Playing a show or recording in Salt Lake? We&apos;ll film 20–30
            seconds of you, cut it properly, and hand you the clip and a
            Spotify Canvas. Free while we build the series.
          </p>
          <p className="muted" style={{ fontSize: 14 }}>
            Spotlights are for artists whose work fits what <FourILower /> stands
            for: music made with purpose, that connects and uplifts. Submitting
            isn&apos;t a guarantee. We&apos;ll reach out if it&apos;s a good fit.
          </p>
          <div className="cta" style={{ marginTop: 24 }}>
            <Link
              href="/inquire?for=spotlight" className="btn btn-solid"
              data-event="spotlight_cta_clicked" data-placement="home_spotlight"
            >
              Submit for a Spotlight
            </Link>
          </div>
          </div>
          {/* The first Spotlight (Lesser Moose, Oct 2026). Video on R2 through 4i Productions' /media, like the
              hero; the master is on the T7 under 4i/Social Media/Weekly Social Content/26.19.12/4i Records. */}
          <video
            className="spotlight-video"
            src={`${PRODUCTIONS_SITE}/media/records/lesser-moose-spotlight.mp4`}
            poster="/spotlight/lesser-moose-poster.jpg"
            autoPlay muted loop playsInline controls preload="metadata"
            aria-label="Artist Spotlight: Lesser Moose"
          />
        </div>
      </section>

      {/* The free 4i plugin (26 Oct). */}
      <section className="section tight">
        <div className="wrap">
          <PluginPromo placement="home_plugin" />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section tight">
          <div className="wrap">
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", gap: 16, flexWrap: "wrap",
            }}>
              <h2 className="display" style={{ margin: 0 }}>Free tools</h2>
              <Link href="/resources" className="linkish">All resources →</Link>
            </div>
            <p className="muted" style={{ marginTop: 14 }}>
              The full PDFs and trackers go straight to your inbox.
            </p>
            <div className="grid-3" style={{ marginTop: 26 }}>
              {featured.map((r) => <ResourceCard key={r.slug} resource={r} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section tight">
        <div className="wrap">
          <p className="eyebrow"><FourILower /> Productions</p>
          <h2 className="display" style={{ marginTop: 12 }}>
            When you need it made properly.
          </h2>
          <p className="lede muted">
            Run it yourself with the tools. When you want more hands,{" "}
            <FourILower /> Productions makes the music video, the performance
            visuals, and the short-form from the same shoot.
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


      <section className="section tight">
        <div className="wrap center">
          <h2 className="display">
            4 Artists. 4 Fans. 4 <span className="four">Good</span>.
          </h2>
          <p className="lede muted">
            New tools, first. One email when we publish.
          </p>
          <div className="cta" style={{ justifyContent: "center", marginTop: 30 }}>
            {/* `from` names this button on the /inquire side (email_signup_submitted). */}
            <Link href="/inquire?for=updates&from=home-newsletter" className="btn btn-solid">
              Keep me posted
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
