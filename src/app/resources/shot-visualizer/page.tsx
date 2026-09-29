import type { Metadata } from "next";
import Visualizer from "@/shot-visualizer/Visualizer";
import { SHOT_VISUALIZER_LISTED } from "@/lib/flags";
import { shotListSignup } from "./actions";

/* The shot visualizer, shared with 4i Productions (src/shot-visualizer is
   copied between the two repos). Reachable by link; listed on /resources
   and indexed only once SHOT_VISUALIZER_LISTED is on. */
export const metadata: Metadata = {
  title: "Shot visualizer",
  description: "Pick a shot size, lens, aperture, angle and move, and see it through the camera.",
  ...(SHOT_VISUALIZER_LISTED ? {} : { robots: { index: false, follow: false } }),
};

export default function ShotVisualizerPage() {
  return <Visualizer brand="4i Records · 4irecords.com" signup={shotListSignup} />;
}
