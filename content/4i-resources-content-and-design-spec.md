# 4i Records — Resource Library: Content & Design Spec

**For Claude Code. Target: 4irecords.com `/resources/[slug]`.**
Companion to `4i resources + future vision build.md` (site architecture). This file carries the design tokens and the finished copy for the first three resources.
Last updated 2026-09-21.

---

## 1. Design tokens

Pulled from the live 4irecords.com — match these exactly.

### Color

The 4i brand is a **single dark world**. It does not flip to light; there is no `prefers-color-scheme` branch.

```css
:root{
  --ground:#0A0A0A;                    /* page background — from live site body */
  --surface:#111111;                   /* cards, tables, panels */
  --surface-2:#161616;                 /* table headers, footers, totals bars */
  --ink:#F0F0F0;                       /* primary text */
  --ink-2:#C4C4C4;                     /* body / secondary */
  --ink-3:#888888;                     /* meta, captions, labels */
  --rule:rgba(255,255,255,.14);        /* borders */
  --rule-soft:rgba(255,255,255,.07);   /* inner hairlines */
  --accent:#57FF52;                    /* 4i neon green */
  --accent-soft:rgba(87,255,82,.10);
  --accent-ink:#57FF52;
  --signal:#57FF52;
  --warn:#FFD152;                      /* amber, also from the live site */
  color-scheme:dark;
}
```

Anything sitting **on** a green fill takes `#0A0A0A` text, never white. Green is for numbers, labels, links, and one-per-section emphasis — never for large areas.

### Type

Three faces, each with one job. This split is deliberate: Anton and Roboto Mono are the brand's texture, but neither is a reading face, so running text belongs to Inter.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;800&family=Roboto+Mono:wght@400;500;700&display=swap">
```

| Role | Family | Used for |
|---|---|---|
| Display | **Anton** (400 only) | h1–h4, card titles, tier/role names, the 4i lockup |
| Body | **Inter** (400/600/800) | all running text, list items, table body, captions, form controls, fine print |
| Utility | **Roboto Mono** (400/500/700) | eyebrows, labels, export specs, every number, byline, platform tags |

Fallbacks: `Haettenschweiler, "Arial Narrow Bold", sans-serif` / `system-ui, -apple-system, sans-serif` / `ui-monospace, SFMono-Regular, Menlo, monospace`.

**Anton is always UPPERCASE** — `text-transform: uppercase` on every rule that sets it, no exceptions. Lowercase Anton is unreadable at body sizes. It also ships one weight: never set `font-weight` above 400 on it, and never fake-bold it.

Scale: body 16px / 1.65 in Inter. h1 `clamp(30px, 5.4vw, 50px)` Anton uppercase, +0.02em tracking. h2 24px, h3 17px, same treatment. Standfirst 17px Inter in `--ink-2`. Mono labels 10–11.5px uppercase, 0.11–0.16em tracking. Reading column `68ch`.

### Layout

- Article + sticky right rail: `grid-template-columns: minmax(0,1fr) 316px; gap: 56px`. One column at 900px.
- Rail: `position: sticky; top: calc(env(safe-area-inset-top,0px) + 88px)`.
- Outer wrap `max-width: 1180px`, 20px side padding minimum.
- Cards: 1px `--rule` border, 4–8px radius, `--surface` fill. Grids use `gap:1px` on a `--rule` background for hairline dividers.
- Green appears as: the left border on callouts, the underline on `.ctalink`, every number in a stat or spec position, and the "PRO TIP" / eyebrow labels. Nothing else.

### Components to build

| Component | Where used |
|---|---|
| `.phase` — left tier/time label (mono, green) + right content block | Weeks in R1, tiers in R2, on-set notes in R3 |
| `.checkrow` — 14px empty square + line of text | All checklists |
| `.note` — accent left-border callout | Emphasis lines |
| `.protip` — bordered box, green "PRO TIP" label | Tips in R1 and R2 |
| `.locked` — blurred content + centered email gate card | Gated sections (§2) |
| `.estimator` — 150px / 1fr / 132px grid per row, custom green select caret, green cost column | R2 |
| `.counter` — checkbox rows, green stat numbers | R3 |
| `.szgrid` — inline SVG safe-area diagrams, white UI bands at 13% opacity on `#050505` | R3 |
| `.endcta` — bordered closing block with underlined green link | All three |

**Buttons:** in-article CTAs are a *subtle underlined link* (`.ctalink` — mono, uppercase, 11.5px, 0.08em tracking, 1px green bottom border). Filled green buttons with `#0A0A0A` text are for gate form submits only.

---

## 2. Gating

Readable content is never gated. What the email buys is **the interactive tools and reference tables, unlocked in the browser** — plus a link emailed back so the artist can return to them. Email only: no account, no password, no second field.

Gated blocks:

| Resource | Gated block | Element id |
|---|---|---|
| 01 | "Sizes for assets" spec table | `#specblock` |
| 02 | "Free & cheap artist resources" table | `#resblock` |
| 03 | "Count your own shoot" counter | `#cntblock` |

Behavior: content renders in the DOM with `filter: blur(7px); pointer-events:none; user-select:none`, with an absolutely positioned `.lockface` card centered over it. On submit, **every** `.locked` block on the page gets `.open` — one email opens the whole page, not just the block they happened to click. Blur transitions off over 0.5s and the lockface hides. Then send the artist an email containing the direct URL to that resource.

Confirmation state after submit: *"Unlocked. We also sent the link to <email> so you can come back to it anytime."*

Privacy line under every form: *"One field. Unlocks it here and emails you the link so you can come back to it. Unsubscribe anytime."*

Tag the contact with the resource slug plus `resource-downloader`.

### What the email actually sends

The email does two jobs: it unlocks the page in the browser, and it delivers a file bundle so the artist has the material offline and can calculate in a spreadsheet.

Bundle contents (`4i-artist-resources-bundle.zip`):

| File | What it is |
|---|---|
| `README.txt` | What's in the folder, how to import the .xlsx files into Google Sheets, where the live versions live, and the 4i Productions pitch |
| `4i-01-release-label-visuals-checklist.pdf` | Full resource, printable, spec table unblurred |
| `4i-02-what-pro-visuals-actually-cost.pdf` | Full resource, printable, resource list unblurred |
| `4i-03-the-cutdown-matrix.pdf` | Full resource, printable, counter shown as a static table |
| `4i-budget-estimator.xlsx` | The estimator as a working spreadsheet — A/B/C dropdown per role, live cost columns and total |
| `4i-cutdown-counter.xlsx` | The counter as a working spreadsheet — YES/NO per deliverable, live totals and weeks-of-content |

Spreadsheet conventions: brand dark styling — `#0A0A0A` sheet ground, `#111111` rows, green `#57FF52` headers with dark text, green formula results. Fonts follow the same three-role split: Anton for the two title rows, Roboto Mono for options and every number, Inter for descriptions and notes. **Amber `#FFD152` fill marks every cell the artist edits**, and a LEGEND row at the top says so. Rate lookups use `INDEX`/`MATCH` against a hidden `Rates` sheet, so nothing breaks in Google Sheets or Numbers. Both files carry a source line and a 4i Productions line at the bottom.

PDF conventions: same dark brand palette, Anton headings, Inter body, Roboto Mono labels and numbers, with all three fonts **embedded in the file** (base64 woff2 @font-face) so they render identically everywhere rather than falling back. A running header on every page carries the 4i lockup and `4IRECORDS.COM/RESOURCES` over a green rule; a running footer carries `4irecords.com · 4 artists. 4 fans. 4 good.` and `Page n / N`. green rule under the 4i masthead. **Every checklist box in Resources 01 and 02 is a real AcroForm checkbox** (29 and 23 respectively) — they tick in Preview, Acrobat and browser viewers, with a green check on the dark box. They're generated by locating each printed square by its unique `#4A4B4C` stroke color and overlaying a widget annotation at that rect, so the build survives copy changes without hand-placed coordinates.

**Why the calculating tools are web-plus-spreadsheet, not fillable PDF:** PDF checkboxes tick fine (and ours do), but PDF form fields can't auto-*calculate* outside Adobe Acrobat — a "fillable" PDF estimator would look broken in Preview and browser tabs. So: checklists are fillable in the PDF; anything that adds up lives in the .xlsx and on the site, and the PDF carries a box pointing at both.

Regenerate the whole bundle whenever page copy changes — the PDFs are rendered from the live page and the spreadsheets mirror its numbers.

## 3. Resource 01 — The Release Label Visuals Checklist

- **Slug:** `release-label-visuals-checklist`
- **Eyebrow:** Four-week rollout
- **Byline:** 4i Records · Updated Sept 2026 · Four-week plan
- **Gated block:** the "Sizes for assets" spec table (`#specblock`)

### Standfirst

So you're launching a new single, EP, or album, and you need to keep track of all the visual assets you need to create and upload in one place. Great! We're here to help. Here's what one four-week rollout plan looks like:

### Week 1 — Pre-Production

- Your single, EP, or album is finished and ready to be uploaded for distribution
- Vision board created — design your world
- Pre-production for the shoot begins

*Whether you're shooting a visualizer, a lyric video, or a full on music video production, preparation is key. Here are some things to consider during the planning of your visual shoot:* (indented sub-list)

- Shot list
- Props list
- Costume + makeup looks
- VFX shot list for post
- Audio-visual script, if shots need to be specific to song timecode
- Cast and crew call posted to social media to recruit your team
- Location scouting, according to local laws
- Call sheets drafted and sent to the team before shooting
- Production shot list created and sent to the team before shooting
- List of desired BTS shots created and sent to your BTS photographer and videographer
- Crafty (snacks) and meals planned for cast and crew on shoot days
- Equipment list built with your crew, rentals reserved

### Week 2 — Production

- Visuals + BTS shot
- Cover art selected and created
- Key stills selected and edited
- Song uploaded and scheduled for release with cover art
- First teaser post created + posted, using BTS video from the shoot, clips from the shots, and/or key stills

### Week 3 — Rollout

- New key stills uploaded as profile pictures and banners to Amazon Music, YouTube Music, Spotify, and Apple Music
- Main visual edited (long-form music video)
- 3–5 clips selected from the main visual edit, exported in various social sizes
- First 3–5 clips posted

### Week 4 — Release

- Song is released
- Top performing clips re-edited with different hooks and re-posted
- 3–5 more clips edited and posted, emulating what worked in the first batch
- Spotify Canvas uploaded
- Clips posted across TikTok, Instagram, and YouTube:

Three platform blocks:

- **YouTube** — Long-form BTS videos, the full visual video, community posts with stills, and Shorts in clip form.
- **Instagram** — Trial reels with lyric video content, clips from the music video, BTS posts with stills, a cover art post with the linked audio as a single, fun BTS highlights as reels, and a CTA in bio with YouTube and streaming links.
- **TikTok** — BTS videos, clips of your process, what the song means to you, how you edited and planned the shoot, what's coming next, reflections on what's working and what isn't.

### Week 5 + — Keep going

Keep posting your clips, doubling down on what works, and moving on from what doesn't. Remember to stay creative and have fun with it.

> **PRO TIP** — Don't get sucked into the metrics. If it fulfills you, excites you, or makes you proud, that *is* working.

### Sizes for assets — GATED (`#specblock`)

Four columns: Platform · Asset · Dimensions · Format & limits. Platform column uses `rowspan`.

| Platform | Asset | Dimensions | Format & limits |
|---|---|---|---|
| Spotify | Artist profile picture | 750 × 750 (1:1) | JPEG or PNG · max 20 MB · .gif accepted but displays static |
| Spotify | Artist header / banner | 2660 × 1140 min | JPEG or PNG · .gif accepted but displays static |
| Spotify | Canvas | 720 × 1280 (9:16) | MP4, 3–8 sec, no audio track, loops clean |
| Apple Music | Artist image | 2400 × 2400 preferred / 800 × 800 min | JPG, PNG · 72 dpi · no text, borders, logos, or URLs |
| Apple Music | Motion artwork | Square, matches cover | Submitted through your distributor, not the artist portal |
| Amazon Music | Artist profile picture | 500 × 500 min (1:1) | JPEG, PNG · max 15 MB |
| Amazon Music | Artist banner / background | 1920 × 1440 min | JPEG, PNG |
| YouTube & YouTube Music | Channel banner | 2560 × 1440 rec. / 2048 × 1152 min | JPG, PNG · max 6 MB |
| YouTube & YouTube Music | Banner safe area | 1546 × 423 | Keep all text and logos inside this — it's what phones show |
| YouTube & YouTube Music | Channel profile picture | 800 × 800 | JPG, PNG · crops to a circle |
| YouTube & YouTube Music | Video thumbnail | 1280 × 720 (16:9) | JPG, PNG · max 2 MB |
| SoundCloud | Profile picture | 1000 × 1000 min (1:1) | JPG, PNG · max 2 MB |
| SoundCloud | Header | 2480 × 520 min | JPG, PNG · max 2 MB |
| Deezer | Profile picture | 500 × 500 (1:1) | JPG |
| Deezer | Channel banner | 1800 × 230 min | JPG · max 6 MB |
| Tidal | Profile picture | 1000 × 1000 (1:1) | JPG · max 10 MB |
| Bandcamp | Profile picture | 600 × 600 (1:1) | JPG, PNG |
| Bandcamp | Header | 975 × 40–180 | JPG, PNG |
| Bandcamp | Album artwork | 2000 × 2000 min (1:1) | TIFF, PNG, PSD |
| Distribution | Cover art | 3000 × 3000 (1:1) | JPG or PNG, RGB · no URLs, prices, or store logos |
| Social exports | Reels / TikTok / Shorts | 1080 × 1920 (9:16) | MP4, H.264 |
| Social exports | Instagram feed | 1440 × 1800 (4:5) | MP4, MOV, or JPG |

Footnote: *Specs verified September 2026.*

### Closing CTA

**The best artists maximize their resources**
Every week on this list is something you can hand off. 4i Productions comes in wherever you need us — pre-production, production, post, or all of it — so the parts you love stay yours and the rest gets handled.
→ *Get a free quote* (links to 4iproductions.com intake)

---

## 4. Resource 02 — What Pro Visuals Actually Cost (and Why)

- **Slug:** `what-pro-visuals-cost`
- **Eyebrow:** Budget breakdown
- **Byline:** 4i Records · Updated Sept 2026 · Four budget tiers
- **Gated block:** the "Free & cheap artist resources" table (`#resblock`)

### Standfirst

As an independent artist planning your own visual shoots, it can seem impossible to get transparent pricing, clarity on what you actually need, what it actually costs, and why. This document changes all of that.

We lay out what filmmaking personnel, equipment, and post-production you can afford and expect according to your budget.

### The four budget tiers

Four cards in a row: Tier 1 **No budget** $0–$500 · Tier 2 **Small budget** $500–$4,000 · Tier 3 **Medium budget** $4,000–$10,000 · Tier 4 **Big budget** $10,000+

If you're here, we're going to assume you fall into the first three categories, but 4i Productions can help you no matter what budget you're working with.

> **Three things every music video needs:** an artist, a camera, and an editor. You can be all three.

Here's how that looks.

**Structural note:** each lead-in paragraph sits ABOVE the tier it introduces, with the section rule above the paragraph, so the paragraph groups visually with the tier below it. Sequence: note → **Tier 1** → lead-in → **Tier 2** → lead-in → **Tier 3** → lead-in → **Tier 4**.

#### Tier 1 — No budget

- Filmed on iPhone or camera at home
- Edited by yourself with tutorials and free assets you can find online (like graicekay.gumroad.com)
- Grab a friend to film for you, or set up a tripod
- Get super creative and have fun

*Lead-in to Tier 2:* If you're operating with a bit more money, you can get other creatives involved who want to work on passion projects for their portfolio. Collaborating with other talented independent creatives can increase the production value and make production go by way more smoothly.

#### Tier 2 — Small budget

- Get together a crew of volunteer filmmakers and use the equipment you can find or afford
- Set up a real shoot day with crafty on set
- Edit yourself, or find a volunteer editor
- Minimal lighting, camera, costume, and location, sourced through sites like Facebook Marketplace and Peerspace *(see the resource list below)*

*Lead-in to Tier 3:* At this stage, you can wear fewer hats and have fun with a more experienced group of creative professionals while keeping other costs (location, costumes, etc.) lower — or spend more budget on more expensive equipment with fewer people involved. It depends on your level of comfort, knowledge, and experience with filmmaking.

#### Tier 3 — Medium budget

- Hire a real DP and director with a good camera and lighting package
- Secure some locations at a well-priced day rate
- Secure volunteer filmmakers and extra actors who can help on set at a discounted rate
- Hire an editor to cut the finished video, and/or cut clips for social media promotion
- Hire a professional BTS photographer or videographer so you have great content for socials
- Splurge on costumes, maybe a makeup artist
- Make sure you're following permit and filming laws in your local area

*Lead-in to Tier 4:* At this level, you can realize a grand-scale vision with lots of qualified professionals to handle the logistics of planning and executing your visual music project.

#### Tier 4 — Big budget

- Experienced professional director
- Professional assistant director to keep the shoot running smoothly
- Director of photography with a professional camera package
- Other camera operators for multicam shooting
- Catering and crafty for grip and lighting crew
- Professional set design and lighting equipment
- Location, prop, and costume rentals
- Makeup artists

### What are expected rates?

For production roles, most creatives charge via **day rate** — the amount of money they'll want per day of shooting. If you only shoot for one day, you pay them for one day, but most large-scale music videos shoot for two days or more.

What you can expect:

- **Professional DP or director** — day rates range from $200 (someone starting out that you struck a deal with) to $1,000+ (working professionals).
- **Camera package** — you can rent a great camera for a few hundred dollars a day, but keep in mind that to get the beautiful cinematic shots you want, you'll also need to rent the specific lenses, lighting equipment, and silks or screens to achieve the look.
- **Grip and gaff crew** — you'll want people on set to move lights, set up safe rigging, help operate equipment, or even just hold lights by hand for guerilla setups. The day rate for gaff and grip crew varies by budget tier: $100 to $2,000 is a low-end to high-end range.
- **Assistant directors** — the same range applies. ADs are very helpful for managing the flow and scheduling of crew, and tracking shot list and coverage progress.
- **Editors** charge hourly or per project, not by the day. An entry-level editor doing this project for a portfolio credit could charge a couple hundred dollars for a finished music video, or could charge hourly. Editor hourly rates range from $20 to $200+ an hour.

#### Day rate ranges (six-tile card)

| Role | Rate | Unit |
|---|---|---|
| DP / Director | $200 – $1,000+ | per day |
| Grip & gaff crew | $100 – $2,000 | per day, each |
| Assistant director | $100 – $2,000 | per day |
| Camera package | $200 – $800+ | per day, w/ lenses |
| Editor | $20 – $200+ | per hour |
| Editor, per project | $200 + | portfolio-rate floor |

> **PRO TIP** — 4i Productions works with creatives in Salt Lake City, Los Angeles, and New York, and editors from all around the world, to get you the best rates for your project in any budget tier.
> → *Get a free quote*

### Where to get the most bang for your buck

#### 1. Lighting

A lot of people think a more expensive camera equals better production value, but it's not true. Most filmmakers will agree the best investment you can make is in lighting — or in creative professionals who are trained to see and arrange shots according to natural lighting.

> **PRO TIP** — [This music video] was shot on an iPhone for $60 — the cost of an iPhone stabilizer from Amazon.
> ⚠ **NEEDS URL** — link to the Weapons video by Graice Kay.

Even if you can't afford expensive lights, training the eye to see composition and good lighting helps elevate the perceived production value of your visual project dramatically. In that case, hiring an experienced DP may be worth it even without an expensive camera or lighting package.

#### 2. Editing

Others might argue your best investment is in editing. Taking even poorly-lit iPhone footage and adding color grading, graphics, and some VFX in post can make your visuals look intentional and creative. Editing is also where you have the most creative freedom to try new visual directions, hooks, effects, and more.

#### 3. Creativity

One thing that money can't buy: creativity, passion, and authenticity. A music video at any budget can be an incredible piece of art by being an honest expression of you, the artist. Remember to enjoy the process — the best music video is one made by you, with the tools you have available, while authentically expressing yourself.

*(bordered box)*
It can be overwhelming to watch hours and hours of filmmaking and editing tutorials. If you'd rather focus on making music, 4i Productions works with talented editors all over the world to get you the most qualified editor for the job at a price that fits within your budget.
→ *Get a free quote*

### Build your own budget — interactive estimator

Seven rows, each a `<select>` with options A / B / C. Selecting updates that row's cost cell and the grand total live. Ranges are per shoot day.

| Role | A | B | C |
|---|---|---|---|
| Director | Self-direct, or a friend cheap/free — **$0** | Experienced independent filmmaker, discounted — **$200–500** | Hire a professional — **$500–1,250** |
| DP | Friend films you, or tripod — **$0** | DP taking it on as a portfolio builder — **$200–500** | Hire a professional — **$1,000–1,800** |
| Gaff & grip crew | Skip entirely — **$0** | Film students or enthusiastic techs — **$100–400** | Hire professionals — **$400–2,000** |
| AD | Do it yourself — **$0** | Someone at a discounted rate — **$100–300** | Hire a professional — **$300–800** |
| Lighting equipment | Natural light / what you have — **$0** | Cheap rental house or second-hand — **$50–250** | Professional lighting package — **$300–1,200** |
| Camera | Phone or camera you own — **$0** | Library, student house, cheap rental — **$0–150** | Professional camera package — **$300–800** |
| Editing | Yourself, or a friend free/discounted — **$0** | 4i Productions discounted artist rate — **$200–600** | Professional editor, years of experience — **$800–2,500** |

Contextual notes that appear under the selected option:

- DP → A: *"Pro tip: you can add natural-looking hand-held motion and zooms in the editing phase to reduce the bore of a tripod shot."*
- Gaff & grip → C: *"These people are often hired or recommended by your DP."*
- Lighting → C: *"Usually specced by your DP or CLT."*
- Camera → C: *"Professional DPs often include this in their rate, or already own a package."*
- Editing → B: *"We give artists discounted rates on their visuals because we love independent artists."*
- Editing → C: *"Also available through 4i Productions."*

Footer: **Estimated total** (sum of ranges) and the line *"Just a fun tool — these are ballpark ranges per shoot day, not quotes."*

### Closing CTA

**4i Productions is here to help at any step of the process**
Whether you need some quick social clips edited or the whole production process taken care of, we'll find the best quote for you as an independent artist on a limited budget.
→ *Get a free quote*

### Free & cheap artist resources — GATED (`#resblock`)

Three columns: Resource · What it's for · Cost. Category column uses `rowspan`. Every name links out.

**Locations** — Peerspace (peerspace.com), hourly rentals of studios, homes, lofts, warehouses · Giggster (giggster.com), film-specific location marketplace · Facebook Marketplace & local groups, DM owners of spaces you've spotted · Your city or county film office, permits and often free public locations

**Gear** — Your public library, many lend cameras, lenses, tripods and lights, free · ShareGrid (sharegrid.com), peer-to-peer camera and lighting rental · Fat Llama (fatllama.com), peer-to-peer rental for gear of all kinds · Your local film school, student equipment checkout · Craigslist (craigslist.org), discounted second-hand gear and local open calls

**Crew & cast** — Film school Facebook and Discord groups, where students look for portfolio work · Actors Access (actorsaccess.com), casting calls, free to post · Backstage (backstage.com) / Mandy (mandy.com), casting and crew calls, posting fee · Your own socials, a crew call post is the highest-yield thing on this list

**Post & assets** — graicekay.gumroad.com, free editing assets, presets, overlays · Pexels / Pixabay / Freesound, free stock footage, stills, sound design

### Filmmaker vocab

| Term | Definition |
|---|---|
| DP | Director of Photography — also called the videographer or cinematographer. Runs the camera and the look of the image. |
| AD | Assistant Director — the person who runs scheduling, the shot list, and crew management. |
| CLT | Chief Lighting Technician — the head gaffer, the person in charge of lighting. A very important art form; works closely with the DP to make your shots look good. |
| Gaffer | The electrician who builds and runs the lighting setup under the CLT or DP. |
| Guerilla | Shooting fast, small, and mobile — minimal gear, minimal crew, often without permits or a locked location. A style, not a compromise. |
| Rigging | The hardware and setup that holds lights, cameras, and grip equipment safely in place — stands, clamps, trusses, mounts. Bad rigging is the most common way people get hurt on a set. |
| Grip | Crew who rig and move everything that shapes or supports light and camera — stands, flags, silks, dollies. |
| Day rate | What a crew member charges per day of shooting, regardless of hours. The standard unit for production roles. |
| Camera package | The camera plus everything it needs to actually shoot — lenses, media cards, batteries, monitor, support. |
| Silks & screens | Fabric and reflective panels used to soften, bounce, or block light. Cheap, and they do more for your image than a better camera. |
| Crafty | The snack and drink table on set. Not optional — a fed crew works better and comes back. |
| Call sheet | The document sent out before a shoot day with times, locations, contacts, and who's needed when. |
| BTS | Behind the scenes — footage and stills of the shoot itself, which becomes most of your social content. |
| Color grading | The post-production pass that sets the final look and mood of the footage. |
| VFX | Visual effects — anything added or altered in post that wasn't in front of the camera. |
| Coverage | The set of angles and takes you shoot for a moment, so the editor has options to cut with. |

---

## 5. Resource 03 — The Cutdown Matrix

- **Slug:** `cutdown-matrix`
- **Eyebrow:** Delivery plan
- **Byline:** 4i Records · Updated Sept 2026
- **Gated block:** the "Count your own shoot" counter (`#cntblock`)

### Standfirst

One shoot. Dozens of deliverables. Here's everything to pull from a single music video, broken down by where it's going and what size it needs to be.

The most expensive mistake independent artists make with video is treating the finished music video as the deliverable. It isn't — it's the source. One shoot holds enough material for weeks of posting, and the only thing separating the artists who get that from the artists who don't is whether they planned the cutdowns before the shoot or after.

> **The math:** a three-minute music video is about 180 seconds of finished picture, cut from one to three hours of usable footage. Posting a single 16:9 upload from that uses roughly 3% of what you paid for.

### By platform

Intro copy: *Every platform wants something different out of the same footage — a different shape, a different length, a different energy. Here's one platform at a time: what to pull, how many, and the exact size to export it at.*

Each platform is a card: header with platform name + deliverable count, then rows of `deliverable (qty) + description` on the left and `ratio / dimensions / notes` right-aligned on the right.

**PDF-only additions:** the opener carries an "At a glance" grid (six tiles — the five platforms plus a From-one-shoot total of 29–55 / 10–18 weeks) so page one doesn't end on a bare heading. YouTube and YouTube Shorts share a page; Instagram, TikTok and Spotify Canvas get their own; each vertical platform's safe-area diagram sits on its page, and the Canvas page closes with all three diagrams side by side for comparison. "Count your own shoot" and "Plan the matrix before the shoot, not after" each start a fresh page — the latter carries the safe-margins line, the hold-back-clips note and the closing CTA. Seven pages total.

#### YouTube — 2–3 uploads

| Deliverable | Description | Spec |
|---|---|---|
| Final music video | The anchor. Lives here permanently and every link you post points back to it. | 16:9 · 1920 × 1080 (or 3840 × 2160) · MP4 |
| Long-form BTS videos ×1–2 | Two to ten minutes each. Horizontal outtakes straight from camera, you explaining what you did to make the video, funny moments between takes, bloopers, and shots that didn't make the cut — with your song playing underneath. | 16:9 · 1920 × 1080 · 2–10 min · MP4 |

#### YouTube Shorts — 7–11 clips

| Deliverable | Description | Spec |
|---|---|---|
| Lyric clips from the finished video ×3–5 | Clips pulled from the final cut with lyrics typed over them. | 9:16 · 1080 × 1920 · under 3 min |
| Cutdowns of your long-form BTS ×2–4 | The best moments from the BTS videos, reframed vertical. | 9:16 · 1080 × 1920 · under 3 min |
| Selected portions of the final video ×2–3 | Straight excerpts, no text — the strongest visual moments standing alone. | 9:16 · 1080 × 1920 · under 3 min |

#### Instagram — 9–19 posts

| Deliverable | Description | Spec |
|---|---|---|
| Teaser reels ×1–2 | Posted as reels, or as trial reels if you want to test them before they hit your followers. | 9:16 · 1080 × 1920 (1440 × 2560 for max quality) |
| Sound design / a cappella shots ×1–2 | One or two shots running with sound design, or an a cappella version of the track underneath. | 9:16 · 1080 × 1920 |
| Lyric clips ×5–10 | Clips from the music video with lyrics cut over them. | 9:16 · 1080 × 1920 |
| Frame grabs & stills ×1–2 posts | Edited frames or stills from the music video, captioned with the release announcement. | 4:5 · 1080 × 1350 (1440 × 1800 preferred) |
| BTS carousels ×1–3 posts | Photos from set, funny moments, the parts of the day that didn't look like the final video. | 4:5 · 1080 × 1350 · up to 20 per carousel |

#### TikTok — 10–20 clips

| Deliverable | Description | Spec |
|---|---|---|
| BTS, funny moments, bloopers ×5–10 | The rawest material you have. This is the footage that doesn't work anywhere else and works best here. | 9:16 · 1080 × 1920 · 10 min max on upload |
| You talking ×5–10 | What the song means to you, how you made the video, how you edited it, your favorite shot, what you're most proud of. | 9:16 · 1080 × 1920 |

#### Spotify Canvas — 1 loop

| Deliverable | Description | Spec |
|---|---|---|
| Silent looping video | Three to eight seconds of selected vertical shots from the music video. Runs behind every single stream of the song. | 9:16 · 720 × 1280 · 3–8 sec · MP4 · no audio track |

Footnote: *Profile pictures, banners, and cover art sizes live in the Release Label Visuals Checklist* (cross-link to Resource 01).

### Count your own shoot — GATED (`#cntblock`)

Checkbox per deliverable type, each carrying `data-lo` / `data-hi`. Toggling recalculates two stats: **deliverables** (lo–hi range) and **weeks at 3 posts/wk** (range ÷ 3, rounded). All checked by default → 29–55 deliverables, 10–18 weeks.

Rows: Final music video 1 · Long-form BTS 1–2 · Shorts lyric clips 3–5 · Shorts BTS cutdowns 2–4 · Shorts video excerpts 2–3 · IG teaser reels 1–2 · IG sound design shots 1–2 · IG lyric clips 5–10 · IG frame grab posts 1–2 · IG BTS carousels 1–3 · TikTok BTS & bloopers 5–10 · TikTok you talking 5–10 · Spotify Canvas 1

Footer line: *"Just a fun tool — counts assume one shoot with someone capturing BTS on the day."*

### Plan the matrix before the shoot, not after

Two decisions on set make all of this possible, and both are free if you make them in advance.

**Frame for the crop** — Shoot wider than your 16:9 needs, or shoot open-gate, so there's room to reframe vertically without losing the subject. Retrofitting a vertical cut out of a tight 16:9 frame is where cutdowns go to die.

**Assign someone to BTS** — One person with a phone, all day, shooting both horizontal and vertical. Most of your TikTok and half your Instagram comes from that person, and nothing else on the call sheet produces it.

### Safe margins beat resolution

Keep anything that needs to be read — faces, lyrics, logos — inside the safe area.

Three inline-SVG diagrams in a row, each a 9:16 frame (viewBox `0 0 108 192`) with shaded UI bands top and bottom, a dashed accent safe rectangle, and — on Reels and TikTok — a lighter vertical strip on the right where the action buttons sit.

| Platform | Top | Bottom | Sides | Note |
|---|---|---|---|---|
| Instagram Reels | 108px | 320px | 60px | Action buttons in the right ~180px |
| TikTok | 130px | 250px | 60px | Action buttons in the right ~180px |
| YouTube Shorts | central 4:5 (1080 × 1440) | — | 60px | No text in the bottom 10–15% |

All measured against a 1080 × 1920 frame. Caption: *Platforms adjust their interfaces without notice — re-check before a big release.*

Then: Hold back four to six clips you never posted. When something unexpectedly catches, you'll want material to follow it with that same week to keep momentum.

### Closing CTA

**The best artists maximize their resources**
Every 4i Productions shoot delivers the final video plus the full cutdown set, and we can cut 20+ clips from your already finished music videos.
→ *Get a free quote*

---

## 6. Open items

1. **Weapons video URL** — the Pro Tip in Resource 02 § Lighting has a dead link. Needs the real URL before launch.
2. **Spec drift** — Resource 01's size table and Resource 03's safe-area numbers should be re-verified quarterly. Note the check date in the page footnote each time.
3. **Cross-links** — R1 ↔ R2 ↔ R3 each reference the others; make sure slugs match whatever the CMS produces.
4. **ESP wiring** — every gate form posts to the same endpoint with a `resource` tag. Duplicate emails should re-send the file rather than error.
5. **All CTAs** point to the 4i Productions intake, which shows an estimated price range before submit.
6. **Email bundle** — see §2. Six files: README, three PDFs, two spreadsheets. Regenerate whenever page copy changes, since the PDFs are rendered from the live page.
7. **README** — the Google Sheets import walkthrough assumes the desktop upload flow; revisit if Google changes that UI.
