import Link from "next/link";
import { FORMAT_LABEL, hasDownload, type ResourceMeta } from "@/lib/resources";

/* One card for every list of resources (home, /resources, "More
   resources"), so the banner and badge can't drift between them. */
export function ResourceCard({
  resource: r, showMeta = false,
}: {
  resource: ResourceMeta;
  showMeta?: boolean;
}) {
  return (
    <Link href={`/resources/${r.slug}`} className={r.banner ? "card card-has-banner" : "card"}>
      {r.banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.banner} alt="" className="card-banner" loading="lazy" />
      )}
      <span className={hasDownload(r) ? "badge badge-has-dl" : "badge"}>
        {FORMAT_LABEL[r.format]}
      </span>
      <h3 className="card-title">{r.title}</h3>
      <p className="muted" style={{ fontSize: 13.5, margin: showMeta ? "0 0 14px" : 0 }}>
        {r.description}
      </p>
      {showMeta && (
        <p style={{ margin: 0, fontSize: 12 }} className="muted">
          {r.downloadExternal ? "Download on Gumroad" : r.downloadFile ? "Includes a download" : "Read only"}
        </p>
      )}
    </Link>
  );
}
