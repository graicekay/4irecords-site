/* ============================================================
   Every line of prose the shot visualizer shows. Grace writes these;
   `COPY:` marks a placeholder. Nothing else in the folder holds text
   beyond industry names (UWS, 85mm, Push in) and button labels.

   Shared verbatim by 4iProductions-site and 4irecords-site. Edit it in
   both, or copy this folder across again.
   ============================================================ */

import type { AngleKey, MoveKey, SizeKey } from "./shots";

export const COPY = {
  title: "Shot visualizer",
  intro: "COPY: one or two lines on what this tool is for.",

  sizes: {
    uws: "COPY: what an ultra wide shot is for.",
    ws: "COPY: what a wide shot is for.",
    fs: "COPY: what a full shot is for.",
    ms: "COPY: what a medium shot is for.",
    mcu: "COPY: what a medium close-up is for.",
    cu: "COPY: what a close-up is for.",
    ecu: "COPY: what an extreme close-up is for.",
    insert: "COPY: what an insert is for.",
  } satisfies Record<SizeKey, string>,

  lens: "COPY: what focal length changes (distance, compression).",
  aperture: "COPY: what the f-stop changes (depth of field, bokeh).",

  angles: {
    eye: "COPY: eye level.",
    low: "COPY: low angle.",
    high: "COPY: high angle.",
    bird: "COPY: bird's eye.",
    worm: "COPY: worm's eye.",
    dutch: "COPY: Dutch angle.",
    ots: "COPY: over-the-shoulder.",
  } satisfies Record<AngleKey, string>,

  moves: {
    static: "COPY: static.",
    push: "COPY: push in.",
    pull: "COPY: pull out.",
    zoomIn: "COPY: zoom in.",
    zoomOut: "COPY: zoom out.",
    dollyZoom: "COPY: dolly zoom.",
    pan: "COPY: pan.",
    tilt: "COPY: tilt.",
    truck: "COPY: truck.",
    crane: "COPY: crane.",
    handheld: "COPY: handheld.",
  } satisfies Record<MoveKey, string>,

  /* Shown when a worm's eye would put the camera under the floor. */
  floored: "COPY: note that the camera is on the floor.",
  /* Shown when an over-the-shoulder is too tight for a second person. */
  otsTooTight: "COPY: note that there's no room for a shoulder at this distance.",

  listEmpty: "COPY: what to do to start a shot list.",
  gateHeading: "COPY: heading above the email box.",
  gateBody: "COPY: one line on why we ask for an email.",
  gateThanks: "COPY: thank-you line after the email.",
};
