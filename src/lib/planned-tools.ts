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
      /* Grace's line from the 4i Productions resources card. */
      blurb: "Specify lenses, focal length, and aperture for your shot lists with this handy tool.",
      href: `${PRODUCTIONS_SITE}/resources/shot-visualizer`,
      banner: "/resources/shot-visualizer/banner.svg",
    }]
  : [];
