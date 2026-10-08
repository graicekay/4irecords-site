import type { Metadata } from "next";
import { SpinningRecord } from "@/components/SpinningRecord";
import { Stickers } from "@/components/Stickers";
import { LINKS_STICKERS } from "@/lib/stickers";
import { LinksShotVisualizer } from "@/components/LinksShotVisualizer";
import { allResources } from "@/lib/resources";
import { PRODUCTIONS_SITE } from "@/lib/links";

/* The 4i Records bio link page, the same kind of page as
   4iproductions.com/links: the hero (green wash, the lockup, the record
   rising from the bottom edge), shorter; the free tools first; the shot
   visualizer folded under a 4i Productions button; then 4i Productions'
   work as a sideways gallery. No nav or footer (see globals.css), not in
   the sitemap, noindex: it only makes sense arriving from a bio. */
export const metadata: Metadata = {
  title: { absolute: "4i Records" },
  description: "Free tools for independent artists.",
  robots: { index: false, follow: false },
};

type Piece = { slug: string; title: string; format: "horizontal" | "vertical"; href: string; still: string };

/* 4i Productions publishes its work list newest first; read it hourly so a
   piece added there shows up here without touching this site. */
async function productionsWork(): Promise<Piece[]> {
  try {
    const res = await fetch(`${PRODUCTIONS_SITE}/api/work`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return ((await res.json()) as { pieces: Piece[] }).pieces ?? [];
  } catch {
    return [];
  }
}

export default async function LinksPage() {
  // Artists' tools only: the Weapons graffiti pack is Graice Kay's, not here (Grace, 8 Oct).
  const tools = allResources().filter((r) => !r.draft && r.slug !== "weapons-graffiti");
  const work = await productionsWork();

  return (
    <div className="links-page">
      <section className="links-hero">
        <Stickers items={LINKS_STICKERS} />
        <h1 className="links-wordmark">
          <span className="sr-only">4i Records</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/4i-records-lockup.svg" alt="" className="links-lockup" />
        </h1>
        {/* Slower than the home page's 33⅓: about half. */}
        <SpinningRecord className="hero-record links-record" rpm={16} />
      </section>

      <div className="links-body">
        <section aria-labelledby="links-tools-title" className="links-section">
          <h2 id="links-tools-title" className="links-label">Free tools for artists</h2>
          <ul className="links-tools">
            {tools.map((t) => {
              const img = t.banner ?? t.cover;
              return (
                <li key={t.slug}>
                  <a href={`/resources/${t.slug}`} className="links-tool"
                    data-event="bio_link_clicked" data-tile={t.slug.replace(/-/g, "_")} data-placement="links">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={img} alt="" className="links-tool-img" loading="lazy" /> : <span className="links-tool-img" />}
                    <span className="links-tool-text">
                      <span className="links-tool-title">{t.title}</span>
                      <span className="links-tool-blurb">{t.description}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <LinksShotVisualizer />

        {work.length > 0 && (
          <section aria-labelledby="links-work-title" className="links-section">
            <div className="links-head">
              <h2 id="links-work-title" className="links-label">
                <span className="no-caps">4i</span> Productions: pro visuals
              </h2>
              <a href={`${PRODUCTIONS_SITE}/work`} className="links-more" data-link-id="productions_work" data-placement="links">
                See all →
              </a>
            </div>
            <ul className="links-gallery">
              {work.map((p) => (
                <li key={p.slug} className={p.format === "vertical" ? "links-gallery-v" : undefined}>
                  <a href={p.href} aria-label={`Watch ${p.title}`} title={p.title}
                    data-link-id={`productions_work_${p.slug.replace(/-/g, "_")}`} data-placement="links">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.still} alt="" loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <a href="/" className="btn btn-solid links-proceed"
          data-event="bio_link_clicked" data-tile="proceed_to_site" data-placement="links">
          Proceed to site →
        </a>
      </div>
    </div>
  );
}
