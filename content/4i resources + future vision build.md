# 4i Resources + Future Vision Build

**Spec sheet for Claude Code — 4irecords.com**
Owner: Grace Kelly (4i Records)
Date: 2026-09-21
Status: Draft for build

> **Read with:** `4i-resources-content-and-design-spec.md` — that file carries the final brand tokens (colors, fonts), the gating behavior, and the finished copy for the first three resources. Where the two disagree, the content spec wins; it is newer.

---

## 0. Open decisions (resolve before build starts)

| # | Decision | Notes |
|---|---|---|
| 1 | **Platform** — keep 4irecords.com on Squarespace, or rebuild as Next.js on Vercel? | Claude Code can only build the second. Recommendation: rebuild on Next.js/Vercel to match 4iproductions.com and graicekay.com, so all three share a stack and the email capture can talk to the same backend. |
| 2 | **Email service provider** | Needs to send the bundle zip and the return link. Options: Resend (dev-friendly, cheap), ConvertKit/Kit (creator-focused, tagging + sequences built in), Mailchimp. Recommendation: Kit — tagging and automated delivery without custom code. |
| 3 | **File hosting for gated assets** | Vercel Blob, or attach directly in the delivery email. Recommendation: Vercel Blob with signed/obscure URLs, linked from the email. |
| 4 | **Do inquiry submissions go to the 4i Productions dashboard, or a separate inbox?** | Ideally reuse the existing dashboard so all inbound lives in one place. |

---

## 1. Purpose of the site

4irecords.com is the **artist-facing front door** for the 4i ecosystem. It does four jobs, in this order of on-page weight:

1. **Give away real value** to independent artists (free resource library) — this is the largest part of the site and the reason anyone shares the link.
2. **Route artists who need professional visuals** to 4i Productions.
3. **Communicate the future vision** (creative marketplace, live events) honestly, as a roadmap.
4. **Build the list** — capture emails and early interest so the marketplace launches to an audience instead of to silence.

**Positioning line:** *4i Records is building the infrastructure independent artists don't have. Right now, the piece that's live is visuals.*

**Do not** present the site as "coming soon." The roadmap is one section near the bottom, not the headline.

---

## 2. Site map

```
/                         Landing page
/resources                Resource library index
/resources/[slug]         Individual resource (readable HTML + gated download)
/visuals                  4i Productions pitch + redirect
/vision                   Future vision / roadmap / early access
/inquire                  Combined inquiry + early-access form
/thanks                   Post-submission confirmation
```

Global nav: Resources · Visuals · Vision · Inquire

---

## 3. Page specs

### 3.1 `/` — Landing page

Sections, top to bottom:

1. **Hero** — mission statement ("a record label that lets artists be their own record label"), one line of sub-copy, two CTAs: *Get the free resources* (primary) and *Get pro visuals* (secondary).
2. **What 4i is** — short: artists keep 100% of masters; we don't make money unless you make money; purpose-driven artists over purely commercial.
3. **Free resources strip** — 3–4 cards pulling the featured resources, each linking to `/resources/[slug]`.
4. **Visuals band** — visual-forward section with 2–3 embedded case-study videos, one line of results per artist, CTA to `/visuals`.
5. **Where 4i is going** — condensed roadmap, 3 items, CTA to `/vision`.
6. **Email capture footer** — single field, "Get new resources when we publish them."

### 3.2 `/resources` — Resource library

- Grid of resource cards: title, one-line description, format badge (Guide / Template / Breakdown), and whether a download is attached.
- No gate to browse. No gate to read.
- Sort: featured first, then newest.

### 3.3 `/resources/[slug]` — Individual resource

**This is the most important template on the site.** Structure:

1. **Full readable content as HTML** — the entire substance of the resource on the page. Indexable by Google, shareable, no email required. This is non-negotiable: the value must be provable before anything is asked.
2. **Gate block** — email only, one field. Submitting unlocks every gated block on the page *and* emails the artist a link back plus the file bundle (three PDFs, two spreadsheets, a README). See the content spec, §2, for the full behavior and the exact gated element per resource.

3. **Related resources** — 2–3 links.
4. **Soft CTA at the bottom** — "Can't execute this yourself? That's what 4i Productions is for." → `/visuals`.

**Content model** (MDX or CMS — MDX is fine to start):

```yaml
title: string
slug: string
description: string          # one line, used on cards + meta
format: guide | template | breakdown
featured: boolean
publishedAt: date
downloadFile: string | null  # blob URL; null = no gate, read-only resource
downloadLabel: string        # e.g. "Download the fillable shot list (PDF)"
body: mdx
```

### 3.4 `/visuals` — 4i Productions

- Lead with work, not copy: reel or grid of video case studies.
- What's offered: music videos, performance visuals, short-form cutdowns, lyric/visualizer content.
- Transparent process: intake → quote range shown before submit → production → delivery.
- **Primary CTA links out to the 4i Productions intake form** (the existing AI intake + quoting flow). Do not rebuild that form here — link to it.
- Note the price-range-before-submit behavior explicitly; it's a trust signal and a filter.

### 3.5 `/vision` — Future vision

Honest roadmap. Three blocks:

1. **The creative marketplace** — artists matched with managers, creative strategists, marketers, promoters, editors, producers, creative directors, stylists. Students and recent grads who want experience with values-aligned artists. Status: **in development.**
2. **Live events** — showcases that double as networking, color-coded wristbands by role so artists, managers, and creatives can find each other. Status: **paused, returning.**
3. **The collective model** — long-term projects, not cohorts. Starting hand-picked (4–5 teams, max 10 artists), opening up later. Status: **hand-picked now, applications open.**

Each block ends with the same CTA into `/inquire`, with the role pre-selected.

Tone note: label everything with an honest status. Ambition reads well; vaporware doesn't.

### 3.6 `/inquire` — Inquiry + early access

One form, branching on a required first question: **"What are you here for?"**

- `I'm an artist looking for visuals` → short form, then redirect to the 4i Productions intake.
- `I'm an artist who wants to be considered by 4i` → name, links (Spotify/IG/TikTok), what they're building, what they need most.
- `I'm a creative who wants on a team` → name, role, portfolio link, availability.
- `Just keep me posted` → email only.

Every submission tags the contact by branch. This form is the early artist/crew database — treat it as the seed list for the marketplace launch.

---

## 4. Email capture — behavior spec

- **One field.** Email only, everywhere.
- **Never gate readable content.** Only the downloadable artifact.
- **Delivery by email**, not instant browser download — this verifies the address and creates the first touch.
- **Tags** on every capture: source page, resource slug, and branch (downloader / artist / creative / general).
- **Double opt-in: off.** It halves conversion at this stage.
- Include an unsubscribe link and a real physical/mailing address in the footer of every send (CAN-SPAM).
- Privacy line under every form: "One email field. We'll send you the file and the occasional new resource. Unsubscribe anytime."

**Do not build accounts, logins, or passwords.** Revisit when there is a dashboard, a marketplace profile, or saved projects to log into.

---

## 5. Design direction

- Visual-forward and dark; this is a music brand, not a SaaS landing page.
- Video thumbnails and real artist work carry the page — avoid stock photography and generic gradient hero illustrations.
- Type: one strong display face for headings, one highly readable face for the long-form resource body. Resource pages need genuine reading comfort — generous line height, ~65–75 character measure.
- Mobile first. Most traffic will arrive from an Instagram or TikTok bio link.
- Accessible contrast on the dark theme; do not ship light-gray-on-black body text.

---

## 6. Technical requirements

- Next.js (App Router) on Vercel, matching the 4i Productions stack.
- MDX for resource content so new resources are a file, not a deploy-blocking code change.
- SEO per resource page: unique title/description, OpenGraph image, JSON-LD `Article`. These pages are the organic acquisition channel — treat SEO as a requirement, not a nice-to-have.
- Analytics: Vercel Analytics. Track download-gate conversion per resource so it's clear which resource is actually pulling.
- Forms: server actions → ESP API. Handle duplicate emails gracefully (resend the file, don't error).
- Rate-limit the form endpoints.
- Redirects: preserve any existing Squarespace URLs that have inbound links.

---

## 7. Build order

1. Resolve the open decisions in §0.
2. Scaffold the project, nav, and design system.
3. Build `/resources/[slug]` template first — it's the highest-value page and everything else links to it.
4. Wire email capture + ESP + file delivery end to end with one real resource.
5. Build `/resources` index.
6. Build `/` landing.
7. Build `/visuals` and `/vision`.
8. Build `/inquire` with branching.
9. SEO, analytics, redirects, mobile QA.
10. Ship. Publish remaining resources as content becomes ready.

Content and site can proceed in parallel — the build only needs one finished resource to be testable.
