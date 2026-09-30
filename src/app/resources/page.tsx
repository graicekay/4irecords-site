import type { Metadata } from "next";
import { mainResources, toolResources } from "@/lib/resources";
import { ResourceCard } from "@/components/ResourceCard";
import { PLANNED_TOOLS } from "@/lib/planned-tools";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Free guides, templates and breakdowns for independent artists. The full PDFs and spreadsheet trackers go straight to your email.",
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
      <section className="wrap page-head">
        <p className="eyebrow">Free</p>
        <h1 className="display">Resources</h1>
        <p className="sub">
          Guides, templates and breakdowns for independent artists.
          We&apos;ll send the full PDFs and spreadsheet trackers directly to
          your email.
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
          {tools.length > 0 && (
            <div className="grid-3" style={{ marginTop: 26 }}>
              {tools.map((r) => <ResourceCard key={r.slug} resource={r} showMeta />)}
            </div>
          )}
          <ul className="planned">
            {PLANNED_TOOLS.map((t) => (
              <li key={t.name} className="planned-item">
                <span className={t.href ? "badge badge-has-dl" : "badge"}>
                  {t.href ? "Live" : "In the works"}
                </span>
                <div>
                  {t.href ? (
                    <a href={t.href} className="planned-name">{t.name} →</a>
                  ) : (
                    <span className="planned-name">{t.name}</span>
                  )}
                  <p className="muted planned-blurb">{t.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
