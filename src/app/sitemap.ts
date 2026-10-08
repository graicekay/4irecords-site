import type { MetadataRoute } from "next";

import { EVENTS_ENABLED, FANS_ENABLED } from "@/lib/flags";
import { allResources } from "@/lib/resources";

const SITE = "https://www.4irecords.com";

/**
 * sitemap.xml: the public pages and every published resource, for search
 * engines. Pages behind a flag join when it's on; drafts, /admin, /login,
 * /feedback and /unsubscribe are noindex and stay out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/mission", "/visuals", "/resources", "/inquire", ...(EVENTS_ENABLED ? ["/events"] : []), ...(FANS_ENABLED ? ["/fans"] : [])];
  return [
    ...pages.map((p) => ({ url: `${SITE}${p || "/"}`, changeFrequency: "monthly" as const, priority: p ? 0.7 : 1 })),
    ...allResources()
      .filter((r) => !r.draft)
      .map((r) => ({ url: `${SITE}/resources/${r.slug}`, lastModified: new Date(r.publishedAt), changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
