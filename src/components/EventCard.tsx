import RsvpForm from "@/components/RsvpForm";
import { formatEventDate, formatEventTime, type EventItem } from "@/lib/events";

/* One show. The flyer falls back to a green-on-grey plate rather than
   a broken image or an empty column, so a show added before its art
   exists still looks intentional. */
export default function EventCard({ event, past = false }: { event: EventItem; past?: boolean }) {
  const withheld = event.addressPolicy === "on-rsvp";

  return (
    <article className="card" style={{ padding: 26, opacity: past ? 0.62 : 1 }}>
      <div className="event">
        {event.flyer ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="flyer" src={event.flyer} alt={`Flyer for ${event.title}`} />
        ) : (
          <div className="flyer flyer-ph" aria-hidden="true">4i</div>
        )}

        <div>
          <p className="when">
            {formatEventDate(event.date)} · {event.doorsAt ?? formatEventTime(event.date)}
          </p>
          <h3 className="display" style={{ fontSize: 34, margin: "10px 0 12px" }}>
            {event.title}
          </h3>

          <p className="muted" style={{ fontSize: 14, margin: 0 }}>
            {event.venue} · {event.city}
            {event.address ? ` · ${event.address}` : ""}
          </p>
          {withheld && !past && (
            <p className="pill" style={{ marginTop: 12 }}>Address sent on RSVP</p>
          )}
          {event.cover && (
            <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>{event.cover}</p>
          )}

          {event.lineup.length > 0 && (
            <ul className="lineup">
              {event.lineup.map((act, i) => (
                <li key={`${act}-${i}`}>{act}</li>
              ))}
            </ul>
          )}

          {event.note && (
            <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>{event.note}</p>
          )}

          {event.rsvp && !past && (
            <details style={{ marginTop: 22 }}>
              <summary className="btn" style={{ display: "inline-block" }}>
                RSVP to this show
              </summary>
              <div style={{ marginTop: 22, maxWidth: 460 }}>
                <RsvpForm
                  eventSlug={event.slug}
                  title={event.title}
                  addressWithheld={withheld}
                />
              </div>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
