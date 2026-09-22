import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventCard from "@/components/EventCard";
import SubscribeForm from "@/components/SubscribeForm";
import { pastEvents, upcomingEvents } from "@/lib/events";
import { EVENTS_ENABLED } from "@/lib/flags";
import { FourIText, FourILower } from "@/components/FourIMark";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming 4i Underground shows. Basements, garages, and neighborhood venues around Salt Lake City.",
};

/* The events list is derived from a JSON file at request time, so a
   show has to drop off the page the day after it happens without a
   rebuild. `force-dynamic` is the blunt version of that; if the site
   ever needs the caching back, swap it for `revalidate = 3600`. */
export const dynamic = "force-dynamic";

export default function Events() {
  /* Hidden rather than deleted — see lib/flags.ts. */
  if (!EVENTS_ENABLED) notFound();

  const upcoming = upcomingEvents();
  const past = pastEvents().slice(0, 4);

  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow"><FourILower /> Underground</p>
        <h1 className="display">Events</h1>
        <p className="sub">
          Packed into basements, garages, and your local neighborhood. No hefty
          venue fees, no expensive tickets.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 48 }}>
        <div className="wrap">
          {upcoming.length === 0 ? (
            <div className="notice">
              <p style={{ margin: 0, fontWeight: 500, color: "var(--accent)" }}>
                Nothing on the books right now.
              </p>
              <p style={{ margin: "8px 0 0" }}>
                We book these close to the date. Subscribe below and you&apos;ll
                know before anyone else does.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 20 }}>
              {upcoming.map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="section">
          <div className="wrap">
            <h2 className="display" style={{ fontSize: 34 }}>Recently played</h2>
            <div style={{ display: "grid", gap: 20, marginTop: 26 }}>
              {past.map((e) => (
                <EventCard key={e.slug} event={e} past />
              ))}
            </div>
          </div>
        </section>
      )}

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
