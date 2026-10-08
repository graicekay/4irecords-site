import { SHOT_VISUALIZER_LISTED } from "@/lib/flags";
import { PRODUCTIONS_SITE } from "@/lib/links";

/* The list under the Tools section at the bottom of /resources. An entry
   with an `href` is live and links out; one without shows "In the works".
   The roadmap stays down here, never the headline. */
export type PlannedTool = { name: string; blurb: string; href?: string; banner?: string };

/* Only live tools for now (Grace, 29 Sep: the lyric tool and the 4i Pro
   panel aren't ready to mention). The shot visualizer appears once
   SHOT_VISUALIZER_LISTED is switched on at its launch. */
export const PLANNED_TOOLS: PlannedTool[] = SHOT_VISUALIZER_LISTED
  ? [{
      name: "Shot visualizer",
      /* Grace's line, the same as the shot visualizer's own intro (8 Oct). */
      blurb: "Frame a shot, light the set and move the camera, then save it all as a shot list to download or share.",
      href: `${PRODUCTIONS_SITE}/resources/shot-visualizer`,
      /* The banner 4i Productions uses (a frame from the tool: FS 35mm f/2, low
         angle, city at night), loaded from there so the two stay in step. */
      banner: `${PRODUCTIONS_SITE}/resources/shot-visualizer/banner.png`,
    }]
  : [];
