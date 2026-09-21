# 4i Records — website

Replaces the Google Site at www.4irecords.com. Same six pages and
substantially the same copy; the Google Forms and the embedded Google
Calendar are gone, replaced by native forms writing to Postgres and an
events list kept in the repo.

| | |
|---|---|
| Stack | Next.js 16 (App Router, TS) · Neon Postgres · Vercel |
| Database | Neon project `4irecords-site` — schema in `schema.sql` |
| Admin | `/admin`, one shared password (`ADMIN_PASSWORD`) |

---

## Pages

| Route | Was | Notes |
|---|---|---|
| `/` | Home | "We're 4 Artists", 4i Underground |
| `/events` | Events | Replaces the embedded Google Calendar |
| `/mission` | Mission | Copy unchanged |
| `/artists` | `/4-artists` | "What we do" + inquiry form |
| `/fans` | `/4-fans` | Subscribe form |
| `/inquire` | Inquire | The same form as `/artists` |

The two renamed paths are 301-redirected in `next.config.ts`, so
anything already shared under the old URLs still lands.

---

## The three decisions that shape this

### 1. Events are a file, not a table

`src/content/events.json` is the source of truth for shows. A handful
of gigs a month doesn't justify an events CMS, and a file in git has a
history and a rollback for free. Edit it, commit, deploy.

A show with `"addressPolicy": "on-rsvp"` deliberately has no address in
the file — underground shows don't put the house on the public
internet. The address goes out in the RSVP reply instead.

### 2. Submissions go to Postgres, not an inbox

The Google Forms are replaced by three tables — `inquiries`,
`subscribers`, `rsvps` — and `/admin` is where you read them. That's
the trade for dropping Google Forms: there's no response spreadsheet
any more, so the dashboard *is* the record.

No email is sent on submission yet. See "Not built yet".

### 3. All SQL lives in `src/lib/db.ts`

Nothing outside that file writes SQL. Keep it that way.

---

## Running it

```bash
npm install
npm run dev
```

`.env.local` needs:

```
DATABASE_URL=        # Neon pooled connection string
ADMIN_PASSWORD=      # if unset in dev, /admin is open on this machine
```

`ADMIN_PASSWORD` is **required in production** — without it `/admin`
returns 503 rather than falling open.

---

## Not built yet

- **No notification email.** A new inquiry, subscriber, or RSVP lands
  in the database silently; you have to open `/admin` to see it. Adding
  Resend is the obvious next step, and is the one thing the Google Form
  did that this doesn't.
- **No sending to the mailing list.** The list is collected but there's
  nothing to send from. Export it or wire up a sender.
- **RSVP confirmations aren't sent**, which matters for the shows whose
  address is withheld — right now that address has to go out by hand.
- No artist roster, releases, or past-show gallery. Deliberately out of
  scope for v1.
