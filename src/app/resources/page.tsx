import type { Metadata } from "next";
import { mainResources, toolResources } from "@/lib/resources";
import { ResourceCard } from "@/components/ResourceCard";
import { PLANNED_TOOLS } from "@/lib/planned-tools";
import { Stickers } from "@/components/Stickers";
import { RESOURCES_STICKERS } from "@/lib/stickers";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Free tools for independent artists running their own releases. The full PDFs and trackers go straight to your email.",
};

/* §3.2 — no gate to browse. The reading is open; the size table, the
   resource list and the counter sit behind the email, and so do the PDFs
   and the spreadsheets. Ordered by the explicit `order` field, then
   newest, which `allResources` already handles. */
export default function ResourcesIndex() {
  const resources = mainResources();
  const tools = toolResources();

  return (
    <>
      <section className="wrap page-head has-stickers">
        <Stickers items={RESOURCES_STICKERS} />
        <p className="eyebrow">Free</p>
        <h1 className="display">Free Tools</h1>
        <p className="sub">
          The guides, templates and trackers we use on our own releases. Take
          them and run your release. The full files go to your email.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 48 }}>
        <div className="wrap">
          {resources.length === 0 ? (
            <div className="notice">
              <p style={{ margin: 0, fontWeight: 500, color: "var(--accent)" }}>
                Nothing published yet.
              </p>
              <p style={{ margin: "8px 0 0" }}>The first resources are being written.</p>
            </div>
          ) : (
            <div className="grid-3">
              {resources.map((r) => <ResourceCard key={r.slug} resource={r} showMeta />)}
            </div>
          )}
        </div>
      </section>

      {/* Tools: packs hosted elsewhere and what's being built next. Kept at
          the bottom so the roadmap never reads as the headline. */}
      <section className="section">
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 30, margin: 0 }}>Tools</h2>
          <div className="grid-3" style={{ marginTop: 26 }}>
            {/* Live tools that live on another 4i site: open in a new tab so
                the visitor keeps their place here. */}
            {PLANNED_TOOLS.filter((t) => t.href).map((t) => (
              <a
                key={t.name} href={t.href} target="_blank" rel="noopener"
                className={t.banner ? "card card-has-banner" : "card"}
                /* Cross-site: lib/analytics adds ids, UTMs and ref at click time. */
                data-link-id={t.linkId} data-placement="resources_tools"
              >
                {t.banner && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.banner} alt="" className="card-banner" loading="lazy" />
                )}
                <span className="badge badge-has-dl">Tool</span>
                <h3 className="card-title">{t.name}</h3>
                <p className="muted" style={{ fontSize: 13.5, margin: "0 0 14px" }}>{t.blurb}</p>
                <p style={{ margin: 0, fontSize: 12 }} className="muted">Interactive · opens 4iproductions.com</p>
              </a>
            ))}
            {tools.map((r) => <ResourceCard key={r.slug} resource={r} showMeta />)}
          </div>
          {PLANNED_TOOLS.some((t) => !t.href) && <ul className="planned">
            {PLANNED_TOOLS.filter((t) => !t.href).map((t) => (
              <li key={t.name} className="planned-item">
                <span className="badge">In the works</span>
                <div>
                  <span className="planned-name">{t.name}</span>
                  <p className="muted planned-blurb">{t.blurb}</p>
                </div>
              </li>
            ))}
          </ul>}
        </div>
      </section>
    </>
  );
}
