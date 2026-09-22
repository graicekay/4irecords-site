import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { Locked } from "@/components/Locked";
import { BudgetEstimator } from "@/components/BudgetEstimator";
import { CutdownCounter } from "@/components/CutdownCounter";
import { SafeAreas } from "@/components/SafeAreas";
import DownloadGate from "@/components/DownloadGate";
import {
  FORMAT_LABEL, allResources, relatedResources, resourceBySlug,
} from "@/lib/resources";

/* ============================================================
   §3.3 — the most important template on the site.

   The full resource is rendered as HTML on the page, indexable and
   shareable, with no gate to read it. Only the *usable artifact*
   (the fillable template, the spec sheet) asks for an email. The
   value has to be provable before anything is asked.
   ============================================================ */

const SITE = process.env.SITE_URL ?? "https://www.4irecords.com";

export function generateStaticParams() {
  return allResources().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const resource = resourceBySlug(slug);
  if (!resource) return {};

  const url = `${SITE}/resources/${resource.slug}`;
  return {
    title: resource.title,
    description: resource.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: resource.title,
      description: resource.description,
      url,
      publishedTime: new Date(resource.publishedAt).toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: resource.title,
      description: resource.description,
    },
    /* Placeholders must never be indexed — they'd rank for nothing
       and teach Google the site is thin. */
    ...(resource.draft ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ResourcePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const resource = resourceBySlug(slug);
  if (!resource) notFound();

  const related = relatedResources(slug);

  /* JSON-LD Article (§6). These pages are the organic acquisition
     channel, so the structured data is a requirement. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: resource.title,
    description: resource.description,
    datePublished: new Date(resource.publishedAt).toISOString(),
    author: { "@type": "Organization", name: "4i Records", url: SITE },
    publisher: { "@type": "Organization", name: "4i Records", url: SITE },
    mainEntityOfPage: `${SITE}/resources/${resource.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="wrap page-head">
        <Link href="/resources" className="eyebrow" style={{ textDecoration: "none" }}>
          ← All resources
        </Link>
        <h1 className="display" style={{ fontSize: "clamp(36px, 6vw, 62px)" }}>
          {resource.title}
        </h1>
        <p className="sub">{resource.description}</p>
        <p style={{ marginTop: 18 }}>
          <span className="badge">{FORMAT_LABEL[resource.format]}</span>
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 44 }}>
        <div className="wrap">
          <div className="article">
            <div>
              {resource.draft && (
                <p className="draft-flag">
                  Placeholder content — this resource hasn&apos;t been written yet.
                  It&apos;s here so the page and the download can be tested, and
                  it&apos;s excluded from search engines.
                </p>
              )}
              <div className="prose">
                {/* GitHub-flavoured markdown is not on by default in
                    next-mdx-remote, and every resource is mostly tables —
                    without this they render as literal pipe characters. */}
                <MDXRemote
                  source={resource.body}
                  components={{
                    Locked, BudgetEstimator, CutdownCounter, SafeAreas,
                    /* The spec tables run to four columns and can't shrink
                       below their content. Each gets its own scroller so a
                       phone scrolls the table rather than the whole page. */
                    table: (props) => (
                      <div className="table-scroll">
                        <table {...props} />
                      </div>
                    ),
                  }}
                  options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                />
              </div>

              <div style={{ marginTop: 64, paddingTop: 30, borderTop: "1px solid var(--border)" }}>
                <h2 className="display" style={{ fontSize: 26 }}>
                  Can&apos;t execute this yourself?
                </h2>
                <p className="muted" style={{ fontSize: 14 }}>
                  That&apos;s what 4i Productions is for.
                </p>
                <div style={{ marginTop: 18 }}>
                  <Link href="/visuals" className="btn">See the visuals work</Link>
                </div>
              </div>
            </div>

            <aside className="gate-col">
              {resource.downloadFile ? (
                <DownloadGate slug={resource.slug} label={resource.downloadLabel} />
              ) : (
                <div className="gate">
                  <p className="eyebrow">No download</p>
                  <p className="gate-label" style={{ marginBottom: 0 }}>
                    This one&apos;s a read — everything is on the page, nothing to
                    hand over.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="wrap">
            <h2 className="display" style={{ fontSize: 30 }}>More resources</h2>
            <div className="grid-3" style={{ marginTop: 26 }}>
              {related.map((r) => (
                <Link key={r.slug} href={`/resources/${r.slug}`} className="card">
                  <span className={r.downloadFile ? "badge badge-has-dl" : "badge"}>
                    {FORMAT_LABEL[r.format]}
                  </span>
                  <h3 style={{ marginTop: 14, fontSize: 17 }}>{r.title}</h3>
                  <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                    {r.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
