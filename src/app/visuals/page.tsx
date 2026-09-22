import type { Metadata } from "next";
import CaseStudy from "@/components/CaseStudy";
import { caseStudies } from "@/lib/case-studies";
import { PRODUCTIONS_INTAKE_URL, productionsIntake, type ProductionsType } from "@/lib/links";
import { FourIText } from "@/components/FourIMark";

export const metadata: Metadata = {
  title: "Visuals",
  description:
    "Music videos, performance visuals, short-form cutdowns and visualizers — made by 4i Productions.",
};

/* §3.4. Leads with work, not copy. The primary CTA hands off to the
   4i Productions intake rather than rebuilding it here — that flow
   already shows a quote range before submit, which is the trust
   signal worth pointing at. */

/* Each tile opens the 4i Productions intake with its type already chosen —
   the brief starts one question further along than it otherwise would.
   Short-form cutdowns file as a music video because that is the shoot they
   come out of; there is no separate type for them. */
const OFFER: [string, string, ProductionsType][] = [
  ["Music videos", "Concept through delivery, shot for the song rather than the trend.", "music_video"],
  ["Performance visuals", "Live sessions and stage content that hold up outside the room.", "live_show"],
  ["Short-form cutdowns", "The vertical edits that actually move, cut from the same shoot.", "music_video"],
  ["Narrative projects", "Expand your story and build your world with short films or other narrative projects that elevate your music.", "narrative"],
];

export default function Visuals() {
  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow"><FourIText /> Productions</p>
        <h1 className="display">Visuals</h1>
        <p className="sub">
          Music videos, performance content, and the short-form that comes out
          of the same shoot.
        </p>
      </section>

      {/* Leads with work, not copy — but only when there is work to
          lead with. One video gets the full width; several get a grid;
          none gets an honest line rather than a row of grey boxes. */}
      {caseStudies.length > 0 && (
        <section className="section" style={{ borderTop: 0, paddingTop: 44 }}>
          <div className="wrap">
            {caseStudies.length === 1 ? (
              <div style={{ maxWidth: 820 }}>
                <CaseStudy study={caseStudies[0]!} large />
              </div>
            ) : (
              <div className={caseStudies.length === 2 ? "grid-2" : "grid-3"}>
                {caseStudies.map((c) => (
                  <CaseStudy key={c.youtubeId} study={c} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <h2 className="display">What&apos;s on offer</h2>
          <div className="grid-2" style={{ marginTop: 26 }}>
            {OFFER.map(([title, body, type]) => (
              <a
                className="card card-link"
                key={title}
                href={productionsIntake(type)}
                target="_blank"
                rel="noreferrer noopener"
              >
                <h3>{title}</h3>
                <p className="muted" style={{ fontSize: 14, margin: "0 0 14px" }}>{body}</p>
                <span className="card-cue">Start this brief →</span>
              </a>
            ))}
          </div>
        </div>
      </section>


      <section className="section">
        <div className="wrap center">
          <h2 className="display">Get pro visuals</h2>
          <p className="lede muted">
            Send the specs of your project and we&apos;ll follow up within five
            business days.
          </p>
          <div className="cta" style={{ justifyContent: "center", marginTop: 30 }}>
            <a href={PRODUCTIONS_INTAKE_URL} className="btn btn-solid">
              Start a project at 4i Productions
            </a>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 18 }}>
            This opens 4iproductions.com.
          </p>
        </div>
      </section>
    </>
  );
}
