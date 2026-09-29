/* The move clock, shared by the camera view and the top-down plan so both
   draw the same instant of a move. */

import { rig, movePhase, type Shot, type Rig } from "./shots";

export type Clock = { t0: number; playing: boolean };

/** Seconds into the current move, or 0 when paused. */
export function clockSeconds(clock: Clock): number {
  return clock.playing ? (performance.now() - clock.t0) / 1000 : 0;
}

export function currentRig(shot: Shot, clock: Clock): Rig {
  const t = clockSeconds(clock);
  return rig(shot, shot.move === "static" ? 0 : movePhase(t), t);
}
