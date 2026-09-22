import type { Metadata } from "next";
import Link from "next/link";
import { FORMAT_LABEL, allResources } from "@/lib/resources";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Free guides, templates and breakdowns for independent artists. No gate to read them.",
};

/* §3.2 — no gate to browse, no gate to read. Featured first, then
   newest, which `allResources` already handles. */
export default function ResourcesIndex() {
  const resources = allResources();

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
              {resources.map((r) => (
                <Link key={r.slug} href={`/resources/${r.slug}`} className="card">
                  <span className={r.downloadFile ? "badge badge-has-dl" : "badge"}>
                    {FORMAT_LABEL[r.format]}
                  </span>
                  <h3 style={{ marginTop: 14, fontSize: 18 }}>{r.title}</h3>
                  <p className="muted" style={{ fontSize: 13.5, margin: "0 0 14px" }}>
                    {r.description}
                  </p>
                  <p style={{ margin: 0, fontSize: 12 }} className="muted">
                    {r.downloadFile ? "Includes a download" : "Read only"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
