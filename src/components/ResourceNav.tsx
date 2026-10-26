import Link from "next/link";

import type { ResourceMeta } from "@/lib/resources";

/**
 * The strip across the top of a resource that lets you move between them
 * without going back to the index, plus the free 4i plugin at the end.
 *
 * Numbered, because these have a reading order — the checklist, then the
 * budget guide, then the cutdown matrix — and the numbers are how the PDFs,
 * the bundles and the spec all refer to them.
 */
export function ResourceNav({
  resources,
  current,
}: {
  resources: ResourceMeta[];
  current: string;
}) {
  if (resources.length < 2) return null;

  return (
    <nav className="resnav" aria-label="Resources">
      {resources.map((r, i) => {
        const here = r.slug === current;
        return (
          <Link
            key={r.slug}
            href={`/resources/${r.slug}`}
            className={here ? "resnav-item is-current" : "resnav-item"}
            aria-current={here ? "page" : undefined}
          >
            <span className="resnav-n">{String(r.order ?? i + 1).padStart(2, "0")}</span>
            <span className="resnav-label">{r.title}</span>
          </Link>
        );
      })}
      {/* The free 4i plugin (26 Oct), numbered on after the resources; its section is on /resources. */}
      <Link href="/resources#plugin" className="resnav-item">
        <span className="resnav-n">{String(Math.max(...resources.map((r, i) => r.order ?? i + 1)) + 1).padStart(2, "0")}</span>
        <span className="resnav-label">The free 4i plugin</span>
      </Link>
    </nav>
  );
}
