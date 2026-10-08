import type { MetadataRoute } from "next";

/** robots.txt: everything public, the back office and the API out, and where the sitemap is. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/login", "/unsubscribe"] }],
    sitemap: "https://www.4irecords.com/sitemap.xml",
  };
}
