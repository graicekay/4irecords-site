import InquiryRow from "./InquiryRow";
import {
  downloadStats, listContacts, listInquiries, listRsvps, listSubscribers, rsvpCounts,
} from "@/lib/db";
import { eventBySlug } from "@/lib/events";

export const dynamic = "force-dynamic";

/* Everything the old Google Forms response sheets used to hold, in
   one page: inquiries (with a status you can move), the mailing and
   text list, and RSVPs grouped by show.

   It's one page rather than three because the volume doesn't warrant
   navigation — when it does, split it the way Productions did. */
export default async function AdminPage() {
  const [inquiries, subscribers, rsvps, counts, contacts, dlStats] = await Promise.all([
    listInquiries(), listSubscribers(), listRsvps(), rsvpCounts(),
    listContacts(), downloadStats(),
  ]);
  const list = contacts.filter((c) => !c.unsubscribed);

  const open = inquiries.filter((i) => i.status !== "archived");
  const archived = inquiries.filter((i) => i.status === "archived");
  const mailable = subscribers.filter((s) => !s.unsubscribed);

  /* Group RSVPs by show so the list reads as "who's coming to what"
     rather than one flat stream. */
  const byEvent = new Map<string, typeof rsvps>();
  for (const r of rsvps) {
    const bucket = byEvent.get(r.event_slug) ?? [];
    bucket.push(r);
    byEvent.set(r.event_slug, bucket);
  }

  return (
    <>
      <div className="grid-3" style={{ margin: "36px 0 8px" }}>
        <Stat label="Open inquiries" value={open.length} />
        <Stat label="Subscribers" value={mailable.length} />
        <Stat label="On the list" value={list.length} />
      </div>

      <section className="section">
        <h2 className="display" style={{ fontSize: 30 }}>Inquiries</h2>
        {open.length === 0 ? (
          <p className="muted">Nothing waiting on you.</p>
        ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            {open.map((i) => <InquiryRow key={i.id} inquiry={i} />)}
          </div>
        )}

        {archived.length > 0 && (
          <details style={{ marginTop: 26 }}>
            <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>
              {archived.length} archived
            </summary>
            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              {archived.map((i) => <InquiryRow key={i.id} inquiry={i} />)}
            </div>
          </details>
        )}
      </section>

      <section className="section">
        <h2 className="display" style={{ fontSize: 30 }}>Resource downloads</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Which resource is actually pulling — requests, and how many distinct
          people asked.
        </p>
        {dlStats.length === 0 ? (
          <p className="muted">No downloads requested yet.</p>
        ) : (
          <div className="card" style={{ marginTop: 20 }}>
            <ul className="lineup">
              {dlStats.map((d) => (
                <li key={d.resource_slug} style={{ color: "var(--text)" }}>
                  {d.resource_slug}
                  <span className="muted">
                    {" "}— {d.requests} request{d.requests === 1 ? "" : "s"} from{" "}
                    {d.people} {d.people === 1 ? "person" : "people"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="display" style={{ fontSize: 30 }}>The list</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          {list.length} active · {contacts.length - list.length} unsubscribed
        </p>
        {list.length === 0 ? (
          <p className="muted">Nobody yet.</p>
        ) : (
          <div className="card" style={{ marginTop: 20 }}>
            <ul className="lineup">
              {list.map((c) => (
                <li key={c.id} style={{ color: "var(--text)" }}>
                  <a href={`mailto:${c.email}`} className="muted">{c.email}</a>
                  {c.tags.length > 0 && (
                    <span className="muted"> · {c.tags.join(", ")}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="display" style={{ fontSize: 30 }}>RSVPs</h2>
        {rsvps.length === 0 ? (
          <p className="muted">No RSVPs yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
            {[...byEvent.entries()].map(([slug, list]) => (
              <div className="card" key={slug}>
                <p style={{ margin: 0, fontWeight: 500 }}>
                  {eventBySlug(slug)?.title ?? slug}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    {" "}— {counts[slug] ?? list.length} heads across {list.length} RSVPs
                  </span>
                </p>
                <ul className="lineup">
                  {list.map((r) => (
                    <li key={r.id} style={{ color: "var(--text)" }}>
                      {r.name} ({r.guests}) ·{" "}
                      <a href={`mailto:${r.email}`} className="muted">{r.email}</a>
                      {r.note && <span className="muted"> · {r.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="display" style={{ fontSize: 30 }}>Mailing list</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          {mailable.filter((s) => s.wants_email).length} want email ·{" "}
          {mailable.filter((s) => s.wants_sms).length} want texts
        </p>
        {mailable.length === 0 ? (
          <p className="muted">Nobody yet.</p>
        ) : (
          <div className="card" style={{ marginTop: 20 }}>
            <ul className="lineup">
              {mailable.map((s) => (
                <li key={s.id} style={{ color: "var(--text)" }}>
                  {s.name ?? "—"}
                  {s.email && <> · <a href={`mailto:${s.email}`} className="muted">{s.email}</a></>}
                  {s.phone && <span className="muted"> · {s.phone}</span>}
                  {s.area && <span className="muted"> · {s.area}</span>}
                  <span className="muted">
                    {" "}· {[s.wants_email && "email", s.wants_sms && "sms"]
                      .filter(Boolean).join(" + ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="eyebrow">{label}</p>
      <p className="display" style={{ fontSize: 48, margin: "8px 0 0" }}>{value}</p>
    </div>
  );
}
