import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SubscribeForm from "@/components/SubscribeForm";
import { FANS_ENABLED } from "@/lib/flags";

export const metadata: Metadata = {
  title: "4 Fans",
  description:
    "Support your favorite artists directly by coming to our shows. Subscribe for text and email updates on the best underground shows in your area.",
};

export default function Fans() {
  /* Hidden rather than deleted — see lib/flags.ts. */
  if (!FANS_ENABLED) notFound();

  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow">4 Fans</p>
        <h1 className="display">
          4 Fans. 4 Artists. 4 <span className="four">Good</span>.
        </h1>
        <p className="sub">
          With 4i, music-lovers can directly support their favorite artists by
          attending our shows — because 4i doesn&apos;t take huge revenue cuts or
          charge hefty fees to artists.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 56 }}>
        <div className="wrap center">
          <h2 className="display">We love our fans!</h2>
          <p className="lede muted">
            Come to a show and the money goes where it should — to the people on
            stage.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap narrow">
          <h2 className="display">Subscribe to updates</h2>
          <p className="muted" style={{ marginBottom: 34 }}>
            Fill out the short form below to receive text and/or email updates on
            the best underground shows in your area.
          </p>
          <SubscribeForm />
        </div>
      </section>
    </>
  );
}
