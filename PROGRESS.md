# 4i Records — where things stand

Handoff notes, same convention as the invoiCE and 4i Productions docs.
`README.md` is the spec and the map of pages; this is what's open. If this
file and the code disagree, the code is right — fix the file.

Live at www.4irecords.com (Vercel, team `graicekay`); Neon project
`4irecords-site`, schema in `schema.sql`; `/admin` behind `ADMIN_PASSWORD`.
Started 24 September 2026.

## Pushed 29 Sep: resume here

Everything below "What's built" is live as of the 29 Sep push, including the
resources email (Grace's copy) and the gig poster scribbles pack.

**Gig poster scribbles pack** (`/resources/gig-poster-scribbles`): the two
Gumroad scribble packs combined, 64 PNGs. Sources, the pack folder and the
cover script (`make_cover.py`, `wide` for the 16:9 page cover) are on the T7 at
`4i/4i Records/Resources/Gig Poster Scribbles/`. The zip is 21 MB, too big for a
function response (~4.5 MB), so `downloadHosted` sends the checked signed link
on to a static copy under a random folder in `public/dl/`. New frontmatter:
`format: pack`, `cover`, `downloadHosted`, `payWhatYouWant`.

**Resources look (29 Sep, pushed):** every card has a 2:1 banner
(`banner:` frontmatter), and packs open with a swipeable `gallery:` (cover,
the original art, contact sheets) in `src/components/Gallery.tsx`. The guide
banners are hand-built SVGs in `public/resources/<slug>/banner.svg`; the
scribbles cover, contact sheets and untoned slides come from
`design/resource_art.py`. The style rules are on the T7 at
`Editing Refs/Aesthetic References/4i/4i - Style Rules.md`. The Weapons pack
is a `section: tools` resource whose download (`downloadExternal`) is on
Gumroad. The Tools list (`src/lib/planned-tools.ts`) only shows live tools.
The shot visualizer went live on 4i Productions on 29 Sep, so
`SHOT_VISUALIZER_LISTED` is on: it's a Tools card with its own SVG banner
and Grace's line, opening in a new tab.

**Stickers (29 Sep, pushed):** the banner illustrations are cut out in
`public/stickers/` and scattered behind the home hero, /resources and each
resource page head. There are three blur depths; the layouts are in
`src/lib/stickers.ts`. On the home hero everything is blurred: Grace wants
the spinning record to be the only sharp thing. She took out the checklist
sticker there (white, then green; neither worked).

**Fixed 29 Sep:** the Cutdown Matrix PDF's meta row said "DRAFT — YOUR
COPY GOES HERE" and now says "29–55 DELIVERABLES", and all three PDFs read
"4i RECORDS" (was "4I"). They were patched in place with PyMuPDF, because the
PDFs' source isn't in this repo. The running header
"4iRECORDS.COM/RESOURCES" on every page and "4i PRODUCTIONS IS HERE…" on
page 8 of the costs PDF got the same fix: the I after the 4 was swapped for a dotted i (Arimo = Liberation Sans metrics, Anton).

**Donation box: built, switched off.** The Gumroad-style "Name a fair price
$ 0+" box (`src/lib/donation.ts`) emails the file first, then opens a Stripe
Checkout for any amount over $0 (invoiCE's Stripe account; invoiCE's webhook
ignores these). It only shows when `STRIPE_SECRET_KEY` is set **at build
time**. It's missing on Vercel because Grace's Stripe passkey is stuck with
Stripe support. To switch it on: create a live restricted key (Checkout
Sessions: Write), add it to Vercel as Sensitive/Production, redeploy, then
test with a real $1 and refund it. Local `.env.local` has a sandbox key; the
local `RESEND_API_KEY` is invalid (production's is fine), so full local tests
fail at the email step.

**Honeypot renamed** `website` → `hp_4i` (29 Sep): Chrome autofill filled the
old field, so real people got the silent bot success and nothing was sent.

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

## Shot visualizer (lives on 4i Productions)

Grace, 29 Sep: the tool "is just going to live on 4i Productions but it'll be
linked on 4irecords." The copy that was here (`src/shot-visualizer/`, the
`/resources/shot-visualizer` page and its own email gate) is removed; its
history is in git (last shared version `ffcbb0e`). `/resources` has a card
linking to `4iproductions.com/resources/shot-visualizer`, shown once
`SHOT_VISUALIZER_LISTED` in `src/lib/flags.ts` is on. Spec and progress:
`4iProductions-site/SHOT-VISUALIZER.md`. `schema.sql` still records the
`contacts` table (the other resources use it).

## Planned (26 Sep list, not in order)

3. **Gumroad references: done 29 Sep.** The costs guide (MDX, spec and PDF)
   now points to 4irecords.com/resources for free editing assets
   ("hand-drawn scribbles, graffiti PNGs"), and the PDF's links go there
   too. graicekay.com's links page is being changed in Grace's other
   session.
4. **Resources email rewritten (28 Sep)** with Grace's copy: "Your free
   resources are here.", the asset name as the button, a line to
   4irecords.com/resources, and "For world-immersive visuals, visit
   4iproductions.com" (now the real domain). Download links no longer
   expire (`src/lib/download-token.ts`), and links sent before this work
   again.
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
