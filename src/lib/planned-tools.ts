import { SHOT_VISUALIZER_LISTED } from "@/lib/flags";
import { PRODUCTIONS_SITE } from "@/lib/links";

/* The Tools section at the bottom of /resources: what 4i is building
   next. An entry with an `href` is live and links out; one without is
   "In the works". The roadmap stays down here, never the headline.

   COPY: the blurbs are Claude's plain drafts from the build notes —
   Grace to rewrite. Names follow the 4i Productions PROGRESS.md plan. */
export type PlannedTool = { name: string; blurb: string; href?: string };

export const PLANNED_TOOLS: PlannedTool[] = [
  {
    name: "Shot visualizer",
    blurb: "Plan shots before the shoot: pick a lens and a framing, see the frame, export the shot list.",
    href: SHOT_VISUALIZER_LISTED ? `${PRODUCTIONS_SITE}/resources/shot-visualizer` : undefined,
  },
  {
    name: "Lyric video tool",
    blurb: "Line your lyric sheet up with the track and build a lyric video for social.",
  },
  {
    name: "4i Pro panel",
    blurb: "A panel inside Premiere and After Effects for downloading packs and tools straight into a project, starting with Sketch Stroke.",
  },
];
