import raw from "@/content/case-studies.json";

/* ============================================================
   Case-study videos for /visuals.

   A JSON file rather than hardcoded JSX, so adding one is an edit
   here and nothing else. The page adapts to however many exist:
   one renders large, several render as a grid, none renders an
   honest empty state rather than a row of grey boxes.

   `youtubeId` is the id only — the bit after `v=` or `youtu.be/`,
   not the whole URL.
   ============================================================ */

export type CaseStudy = {
  artist: string;
  title: string;        // the track or piece
  result: string;       // one line on what the work did
  youtubeId: string;
};

export const caseStudies = raw as CaseStudy[];

/* Accepts a full URL or a bare id, so pasting either works. */
export function youtubeId(input: string): string {
  const url = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?.*\bv=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1]!;
  }
  return url;
}
