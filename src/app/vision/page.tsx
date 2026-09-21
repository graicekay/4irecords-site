import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Where 4i is going",
  description:
    "The creative marketplace, live events, and the collective model — with an honest status on each.",
};

/* §3.5. Every block carries a status, because ambition reads well
   and vaporware doesn't. Each ends in the same CTA with the branch
   pre-selected. */
const BLOCKS = [
  {
    eyebrow: "In development",
    title: "The creative marketplace",
    body: "Artists matched with the people who make a career work — managers, creative strategists, marketers, promoters, editors, producers, creative directors, stylists. Including students and recent grads who want real experience with artists whose values they share.",
    cta: "I'm a creative who wants on a team",
    href: "/inquire?for=creative",
    status: "live" as const,
  },
  {
    eyebrow: "Paused, returning",
    title: "Live events",
    body: "Showcases that double as networking. Colour-coded wristbands by role, so artists, managers and creatives can find each other in the room instead of guessing.",
    cta: "Keep me posted",
    href: "/inquire?for=updates",
    status: "paused" as const,
  },
  {
    eyebrow: "Hand-picked now, applications open",
    title: "The collective model",
    body: "Long-term projects rather than cohorts. Starting small and hand-picked — four or five teams, ten artists at most — and opening up from there.",
    cta: "I want to be considered",
    href: "/inquire?for=artist",
    status: "live" as const,
  },
];

export default function Vision() {
  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow">The roadmap</p>
        <h1 className="display">Where 4i is going</h1>
        <p className="sub">
          What&apos;s being built, and how far along each piece actually is. The
          part that&apos;s live today is visuals.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 48 }}>
        <div className="wrap" style={{ display: "grid", gap: 20 }}>
          {BLOCKS.map((b) => (
            <div className="card" key={b.title} style={{ padding: 30 }}>
              <span
                className="badge"
                style={b.status === "live"
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : { borderColor: "#ffd152", color: "#ffd152" }}
              >
                {b.eyebrow}
              </span>
              <h2 className="display" style={{ fontSize: 34, margin: "16px 0 12px" }}>
                {b.title}
              </h2>
              <p className="muted" style={{ maxWidth: "62ch" }}>{b.body}</p>
              <div style={{ marginTop: 22 }}>
                <Link href={b.href} className="btn">{b.cta}</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
