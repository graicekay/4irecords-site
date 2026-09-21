import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTIONS_INTAKE_URL, PRODUCTIONS_LIVE } from "@/lib/links";

export const metadata: Metadata = {
  title: "Visuals",
  description:
    "Music videos, performance visuals, short-form cutdowns and visualizers — made by 4i Productions.",
};

/* §3.4. Leads with work, not copy. The primary CTA hands off to the
   4i Productions intake rather than rebuilding it here — that flow
   already shows a quote range before submit, which is the trust
   signal worth pointing at. */

const CASE_STUDIES = [
  { artist: "Artist name", result: "One line on what the work did." },
  { artist: "Artist name", result: "One line on what the work did." },
  { artist: "Artist name", result: "One line on what the work did." },
];

const OFFER = [
  ["Music videos", "Concept through delivery, shot for the song rather than the trend."],
  ["Performance visuals", "Live sessions and stage content that hold up outside the room."],
  ["Short-form cutdowns", "The vertical edits that actually move, cut from the same shoot."],
  ["Lyric and visualizer content", "The release-day essentials, without the release-day panic."],
];

const PROCESS = [
  ["Intake", "Describe the project in plain language. No forms full of jargon."],
  ["Quote range, before you submit", "You see a price range up front. No discovery call to find out you can't afford it."],
  ["Production", "Pre-production, shoot, edit — with you in the loop at each cut."],
  ["Delivery", "Masters and the cutdowns, in the formats each platform wants."],
];

export default function Visuals() {
  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow">4i Productions</p>
        <h1 className="display">Visuals</h1>
        <p className="sub">
          The piece of 4i that&apos;s live today. Music videos, performance
          content, and the short-form that comes out of the same shoot.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 44 }}>
        <div className="wrap">
          <div className="grid-3">
            {CASE_STUDIES.map((c, i) => (
              <div key={i}>
                {/* Placeholder until real case-study videos are supplied —
                    the spec is explicit that stock imagery is worse than
                    an honest empty slot. */}
                <div className="video-ph" aria-hidden="true">
                  <span>4i</span>
                </div>
                <p style={{ margin: "14px 0 2px", fontWeight: 500, fontSize: 15 }}>
                  {c.artist}
                </p>
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{c.result}</p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 20 }}>
            Case studies go here — send the video links and the one-line results
            and these become real embeds.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="display">What&apos;s on offer</h2>
          <div className="grid-2" style={{ marginTop: 26 }}>
            {OFFER.map(([title, body]) => (
              <div className="card" key={title}>
                <h3>{title}</h3>
                <p className="muted" style={{ fontSize: 14, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="display">How it works</h2>
          <ol className="steps">
            {PROCESS.map(([title, body], i) => (
              <li key={title}>
                <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>{title}</p>
                  <p className="muted" style={{ margin: 0, fontSize: 14 }}>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="wrap center">
          <h2 className="display">Get pro visuals</h2>
          <p className="lede muted">
            You&apos;ll see a price range before you submit anything.
          </p>
          <div className="cta" style={{ justifyContent: "center", marginTop: 30 }}>
            {PRODUCTIONS_LIVE ? (
              <a href={PRODUCTIONS_INTAKE_URL} className="btn btn-solid">
                Start a project
              </a>
            ) : (
              <Link href="/inquire?for=visuals" className="btn btn-solid">
                Start a project
              </Link>
            )}
          </div>
          {!PRODUCTIONS_LIVE && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 18 }}>
              The 4i Productions intake isn&apos;t live yet, so this collects your
              details here and we&apos;ll come to you.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
