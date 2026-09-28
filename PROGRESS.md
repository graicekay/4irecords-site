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

**Resource checklists** (24 Sep): every bullet in a resource is a real
checkbox (`src/components/Checklist.tsx`, mapped to `ul`/`li` in the MDX
renderer). Ticks are remembered in the reader's browser (localStorage, keyed
by page and line text, so editing a resource doesn't shift anyone's ticks).
Unticked boxes are dark (`color-scheme: dark`), ticked ones the accent green.
Known snag: `npx eslint` fails on a config problem unrelated to this; the
build is fine.

## Open

1. **Mobile app, or a web app that behaves like one.** Fans and artists
   reach the site from phones; today it's the responsive site. Decide with
   invoiCE's mobile plan whether this becomes an installable PWA (events
   with add-to-calendar, push for new shows) or stays a site.
2. **More work in the portfolio.** The visuals and artist pages want more
   real material: releases, show photos and video from the T7 drive. The
   layouts hold it; the assets aren't in.

## Planned (26 Sep list, not in order)

3. **Gumroad references now point to 4i Productions.** The free editing
   assets are moving from graicekay.gumroad.com to 4i Productions (see that
   doc). Update `content/resources/what-pro-visuals-cost.mdx` (lines 36 and
   179) and the matching lines in
   `content/4i-resources-content-and-design-spec.md` once the assets are
   live there. Grace writes the replacement copy.
4. **Rewrite the resources email.** The "This link is tied to your email
   address and expires in 7 days… that's what 4i Productions is for" block
   in `src/lib/email.ts` (around line 110) needs new copy from Grace.
   Note: its "4i Productions" link goes to `4irecords.com/visuals`, not
   4iproductions.com; check that's intended.
5. **The resources email went to spam** in Grace's test. Done in code
   (28 Sep): every email now has a plain-text part alongside the HTML, and
   the resource email carries `List-Unsubscribe` + one-click
   `List-Unsubscribe-Post` headers (POST target `/api/unsubscribe`), so
   Gmail shows its own unsubscribe button. DNS is fine: SPF, DKIM and
   DMARC (`p=none`) all present for 4irecords.com. Click and open
   tracking are off in Resend for all three domains (checked 28 Sep; never
   configured). Still open: a
   new sending domain has no reputation yet — mark early test mail "not
   spam". Test with mail-tester.com. The dark design was kept; if spam
   persists after the above, a light version is the next thing to try.
6. **Artist feedback links (idea).** Artists and content creators sign up
   and get a personal link for their Instagram story or bio, where fans
   leave quick, anonymous feedback on a new song, a post or the profile.
   It works like the old anonymous Snapchat question apps (tbh, Sendit,
   NGL, YOLO), but for creative feedback. The goal is to make collecting
   feedback a normal habit for artists and creators. Could be an app or
   the web. Plan moderation and abuse filtering from the start: YOLO was
   pulled from Snapchat in 2021 over bullying. 4i Productions already has
   an anonymous feedback form that could be a starting point.
7. **If 4i Records sells event tickets or downloads,** Utah charges sales
   tax on admission and digital products. Register at tap.utah.gov before
   selling. See the invoiCE doc.

## Running it

```bash
npm install
npm run dev     # localhost:3000
```

Deploy: push to `main`. Schema changes: edit `schema.sql` and apply by hand
(no migration runner, by decision).
