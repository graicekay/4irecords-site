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

/* "template" came from the spec's content model, but nothing here is one —
   a template is a file you fill in and make your own. Added "checklist"
   rather than mislabel the thing the resource is actually called. */
export type ResourceFormat = "guide" | "template" | "breakdown" | "checklist" | "pack" | "tool";

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
  /* A cover image in /public, shown at the top of the page. The asset
     packs have one; the written resources don't. */
  cover?: string;
  /* A path in /public for a download too big to stream. Vercel functions
     return at most ~4.5 MB, so a pack is served by the CDN instead: the
     signed link is still checked, then redirected here. The folder name
     is random so the file can't be guessed. */
  downloadHosted?: string;
  /* Shows the Gumroad-style "name a fair price" box in the gate. */
  payWhatYouWant?: boolean;
  /* Card art: a 2:1 image in /public across the top half of the card.
     Made by design/resource_art.py so every banner shares one treatment. */
  banner?: string;
  /* Swipeable slides at the top of the page (cover, then contact sheets),
     in place of the single `cover`. */
  gallery?: string[];
  /* "tools" moves a resource out of the main grid into the Tools section
     at the bottom of /resources (and out of the numbered strip). */
  section?: "tools";
  /* A download that lives elsewhere (the Weapons pack stays on Gumroad):
     the gate is replaced by a plain link out. */
  downloadExternal?: string;
  downloadExternalLabel?: string;
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

/* The numbered resources: everything not moved to the Tools section. */
export function mainResources(): Resource[] {
  return allResources().filter((r) => !r.section);
}

export function toolResources(): Resource[] {
  return allResources().filter((r) => r.section === "tools");
}

/* Has something to take away, whether gated here or hosted elsewhere. */
export function hasDownload(r: ResourceMeta): boolean {
  return Boolean(r.downloadFile || r.downloadExternal);
}

export function featuredResources(limit = 4): Resource[] {
  return mainResources().slice(0, limit);
}

export function relatedResources(slug: string, limit = 3): Resource[] {
  const all = mainResources();
  const self = allResources().find((r) => r.slug === slug);
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
  checklist: "Checklist",
  pack: "Asset pack",
  tool: "Tool",
};
