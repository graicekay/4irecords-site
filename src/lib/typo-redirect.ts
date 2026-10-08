/* ============================================================
   Misspelled /resources (tracking push P2, shared with
   4iproductions.com). Typed and spoken URLs land on 404s like
   /ressources, /RESOURCES, /resources%20:) or /%20resources.

   A single-segment path is decoded, lowercased and stripped to
   letters; within edit distance 3 of "resources" it goes to
   /resources. Real routes are listed so they can never be caught.
   ============================================================ */

const TARGET = "resources";
const MAX_DISTANCE = 3;

/* Every top-level route this site serves. None is within 3 edits of
   "resources" today; the list keeps it that way if one is added. */
const KNOWN = new Set([
  "", "resources", "visuals", "mission", "inquire", "events", "fans",
  "feedback", "login", "unsubscribe", "admin", "api", "opengraph-image",
]);

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length]!;
}

/** "/resources" if this path is a typo of it, otherwise null. */
export function resourcesTypoTarget(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const raw = segments[0]!;
  if (KNOWN.has(raw)) return null;

  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* keep it raw */ }
  /* Anything with a dot is a file (robots.txt, icon.svg, …), not a typo. */
  if (decoded.includes(".")) return null;

  const letters = decoded.toLowerCase().replace(/[^a-z]/g, "");
  if (!letters) return null;
  return distance(letters, TARGET) <= MAX_DISTANCE ? `/${TARGET}` : null;
}
