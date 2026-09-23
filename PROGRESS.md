# 4i Records — where things stand

Handoff notes, same convention as the invoiCE and 4i Productions docs.
`README.md` is the spec and the map of pages; this is what's open. If this
file and the code disagree, the code is right — fix the file.

Live at www.4irecords.com (Vercel, team `graicekay`); Neon project
`4irecords-site`, schema in `schema.sql`; `/admin` behind `ADMIN_PASSWORD`.
Started 24 September 2026.

## What's built

Six pages replacing the Google Site (see README). Native inquiry and
subscribe forms writing to Postgres. Events from `src/content/events.json`.
PostHog analytics. Every inquiry is forwarded to invoiCE
(`INVOICE_INGEST_URL` + `INVOICE_INGEST_SECRET`) and lands on its Clients
queue; every keep-me-posted sign-up, download and unsubscribe is forwarded
to invoiCE's Audience the same way. Both were backfilled once.

## Open

1. **Mobile app, or a web app that behaves like one.** Fans and artists
   reach the site from phones; today it's the responsive site. Decide with
   invoiCE's mobile plan whether this becomes an installable PWA (events
   with add-to-calendar, push for new shows) or stays a site.
2. **More work in the portfolio.** The visuals and artist pages want more
   real material: releases, show photos and video from the T7 drive. The
   layouts hold it; the assets aren't in.

## Running it

```bash
npm install
npm run dev     # localhost:3000
```

Deploy: push to `main`. Schema changes: edit `schema.sql` and apply by hand
(no migration runner, by decision).
