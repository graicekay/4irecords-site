import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

/* ============================================================
   Resources are MDX files in `content/resources/`, per §6 of the
   spec: a new resource is a file, not a code change.

   Frontmatter matches the content model in §3.3. `downloadFile`
   names a file in `content/files/` — deliberately outside /public,
   so the only way to it is a signed link from lib/download-token.
   A null means the resource is read-only and has no gate at all.
   ============================================================ */

const DIR = join(process.cwd(), "content", "resources");
const FILES = join(process.cwd(), "content", "files");

export type ResourceFormat = "guide" | "template" | "breakdown";

export type ResourceMeta = {
  title: string;
  slug: string;
  description: string;
  format: ResourceFormat;
  featured: boolean;
  publishedAt: string;
  downloadFile: string | null;
  downloadLabel: string;
  /* The reading order Grace set: the checklist, then the budget guide, then
     the cutdown matrix. They were all published the same day, so "newest
     first" put them in whatever order the dates tied in. */
  order?: number;
  /* Marks the placeholder content that ships before Grace's real
     resources land, so it can be listed differently and never
     quietly go live as if it were finished. */
  draft?: boolean;
};

export type Resource = ResourceMeta & { body: string };

function readAll(): Resource[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = readFileSync(join(DIR, file), "utf8");
      const { data, content } = matter(raw);
      return {
        ...(data as ResourceMeta),
        slug: (data.slug as string) ?? file.replace(/\.mdx$/, ""),
        body: content,
      };
    });
}

/* Explicit order first, then featured, then newest — §3.2. */
function order(a: ResourceMeta, b: ResourceMeta): number {
  if (a.order != null || b.order != null) {
    return (a.order ?? Infinity) - (b.order ?? Infinity);
  }
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return +new Date(b.publishedAt) - +new Date(a.publishedAt);
}

export function allResources(): Resource[] {
  return readAll().sort(order);
}

export function resourceBySlug(slug: string): Resource | undefined {
  return readAll().find((r) => r.slug === slug);
}

export function featuredResources(limit = 4): Resource[] {
  return allResources().slice(0, limit);
}

export function relatedResources(slug: string, limit = 3): Resource[] {
  const all = allResources();
  const self = all.find((r) => r.slug === slug);
  if (!self) return all.slice(0, limit);
  /* Same format first, then anything else, never itself. */
  const others = all.filter((r) => r.slug !== slug);
  const sameFormat = others.filter((r) => r.format === self.format);
  const rest = others.filter((r) => r.format !== self.format);
  return [...sameFormat, ...rest].slice(0, limit);
}

/* Resolves a resource's download to a real path, refusing anything
   that tries to climb out of the files directory. */
export function downloadPath(fileName: string): string | null {
  if (fileName.includes("/") || fileName.includes("..")) return null;
  const path = join(FILES, fileName);
  return existsSync(path) ? path : null;
}

export const FORMAT_LABEL: Record<ResourceFormat, string> = {
  guide: "Guide",
  template: "Template",
  breakdown: "Breakdown",
};
