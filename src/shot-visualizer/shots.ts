/* ============================================================
   What each control means, and where it puts the camera.

   `rig()` is the one function both views read: the camera view
   and the top-down diagram draw from the same numbers, so they can
   never disagree. Pure maths, no three.js.

   World: metres, y up. The subject stands at the origin facing +z
   (towards the camera), 1.8m tall.
   ============================================================ */

import { distanceForFrame } from "./optics";

export type SizeKey = "uws" | "ws" | "fs" | "ms" | "mcu" | "cu" | "ecu" | "insert";
export type AngleKey = "eye" | "low" | "high" | "bird" | "worm" | "dutch" | "ots";
export type MoveKey =
  | "static" | "push" | "pull" | "zoomIn" | "zoomOut" | "dollyZoom"
  | "pan" | "tilt" | "truck" | "crane" | "handheld";

export type Shot = {
  size: SizeKey;
  lens: number;
  fStop: number;
  angle: AngleKey;
  move: MoveKey;
  /**
   * What a lens change holds: the framing (the camera moves; the default) or
   * the camera (it stays at `camDist` and only the view widens or narrows).
   */
  hold?: "frame" | "camera";
  /** With hold "camera": the camera's distance from the subject, metres. */
  camDist?: number;
};

/** The distance a shot size puts the camera at on a lens (framing held). */
export function framedDistance(size: SizeKey, lens: number): number {
  return distanceForFrame(SIZES[size].frame, lens);
}

export const DEFAULT_SHOT: Shot = { size: "mcu", lens: 85, fStop: 2, angle: "eye", move: "static" };

/* How much of the scene each size frames (height at the subject, metres)
   and where the frame is centred. Headroom is built into `aim`. */
export const SIZES: Record<SizeKey, { abbr: string; name: string; frame: number; aim: [number, number, number] }> = {
  uws:    { abbr: "UWS", name: "Ultra wide",   frame: 14,   aim: [0, 1.6, 0] },
  ws:     { abbr: "WS",  name: "Wide",         frame: 4.5,  aim: [0, 1.15, 0] },
  fs:     { abbr: "FS",  name: "Full",         frame: 2.1,  aim: [0, 0.9, 0] },
  ms:     { abbr: "MS",  name: "Medium",       frame: 0.95, aim: [0, 1.36, 0] },
  mcu:    { abbr: "MCU", name: "Medium close-up", frame: 0.6, aim: [0, 1.52, 0] },
  cu:     { abbr: "CU",  name: "Close-up",     frame: 0.34, aim: [0, 1.65, 0] },
  ecu:    { abbr: "ECU", name: "Extreme close-up", frame: 0.12, aim: [0, 1.68, 0.09] },
  insert: { abbr: "INS", name: "Insert",       frame: 0.24, aim: [0.13, 1.09, 0.22] }, // the phone in hand
};
export const SIZE_ORDER: SizeKey[] = ["uws", "ws", "fs", "ms", "mcu", "cu", "ecu", "insert"];

export const LENSES = [14, 24, 35, 50, 85, 100, 135, 200];
export const F_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];

export const ANGLES: Record<AngleKey, { name: string; elevation: number; roll: number; azimuth: number }> = {
  eye:   { name: "Eye level",         elevation: 0,   roll: 0,  azimuth: 0 },
  low:   { name: "Low angle",         elevation: -22, roll: 0,  azimuth: 0 },
  high:  { name: "High angle",        elevation: 28,  roll: 0,  azimuth: 0 },
  bird:  { name: "Bird's eye",        elevation: 86,  roll: 0,  azimuth: 0 },
  worm:  { name: "Worm's eye",        elevation: -55, roll: 0,  azimuth: 0 },
  dutch: { name: "Dutch",             elevation: 0,   roll: 18, azimuth: 0 },
  ots:   { name: "Over-the-shoulder", elevation: 4,   roll: 0,  azimuth: 16 },
};
export const ANGLE_ORDER: AngleKey[] = ["eye", "low", "high", "bird", "worm", "dutch", "ots"];

export const MOVES: Record<MoveKey, { name: string }> = {
  static:    { name: "Static" },
  push:      { name: "Push in" },
  pull:      { name: "Pull out" },
  zoomIn:    { name: "Zoom in" },
  zoomOut:   { name: "Zoom out" },
  dollyZoom: { name: "Dolly zoom" },
  pan:       { name: "Pan" },
  tilt:      { name: "Tilt" },
  truck:     { name: "Truck" },
  crane:     { name: "Crane up" },
  handheld:  { name: "Handheld" },
};
export const MOVE_ORDER: MoveKey[] = [
  "static", "push", "pull", "zoomIn", "zoomOut", "dollyZoom", "pan", "tilt", "truck", "crane", "handheld",
];

/** One loop of a move, seconds. */
export const MOVE_SECONDS = 4;

export type Vec3 = [number, number, number];

export type Rig = {
  position: Vec3;
  target: Vec3;
  /** Focal length right now — zooms change it mid-move. */
  focal: number;
  /** Degrees, positive = clockwise. */
  roll: number;
  /** Metres from the camera to the subject; focus follows the subject. */
  focus: number;
  /** The second figure for an over-the-shoulder, if there's room for one. */
  partner: { position: Vec3; facing: number } | null;
  /** Camera stopped short by the floor (worm's eye on a long lens). */
  floored: boolean;
};

const rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const FLOOR = 0.06;
/** How far the front of the face sits ahead of the body's centre line. */
const FRONT = 0.1;

/**
 * Where the camera is at phase `p` (0 → 1 → 0 over a loop, already eased) of
 * the shot's move. `time` is seconds, only used for handheld wobble.
 */
export function rig(shot: Shot, p = 0, time = 0): Rig {
  const size = SIZES[shot.size];
  const angle = ANGLES[shot.angle];
  let focal = shot.lens;
  let distScale = 1;

  switch (shot.move) {
    case "push": distScale = lerp(1.35, 0.72, p); break;
    case "pull": distScale = lerp(0.72, 1.35, p); break;
    case "zoomIn": focal = shot.lens * lerp(1, 1.8, p); break;
    case "zoomOut": focal = shot.lens * lerp(1, 0.55, p); break;
    case "dollyZoom": focal = shot.lens * lerp(1, 2.2, p); break;
  }

  // Zooms keep the camera where it started; everything else solves distance
  // from the focal length in use, which is what makes a dolly zoom hold size.
  const solveAt = shot.move === "zoomIn" || shot.move === "zoomOut" ? shot.lens : focal;
  // Holding the camera still, it stays where it was; a dolly zoom always solves.
  const held = shot.hold === "camera" && shot.camDist && shot.move !== "dollyZoom";
  const d = (held ? shot.camDist! : distanceForFrame(size.frame, solveAt)) * distScale;

  const e = rad(angle.elevation);
  const az = rad(angle.azimuth);
  const dir: Vec3 = [Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)];
  const aim = size.aim;

  let position: Vec3 = [aim[0] + dir[0] * d, aim[1] + dir[1] * d, aim[2] + dir[2] * d];
  let target: Vec3 = [...aim];
  let roll = angle.roll;

  switch (shot.move) {
    case "pan": {
      const yaw = rad(lerp(-18, 18, p));
      const back = [aim[0] - position[0], aim[2] - position[2]];
      target = [
        position[0] + back[0] * Math.cos(yaw) - back[1] * Math.sin(yaw),
        aim[1],
        position[2] + back[0] * Math.sin(yaw) + back[1] * Math.cos(yaw),
      ];
      break;
    }
    case "tilt":
      target = [aim[0], aim[1] + Math.tan(rad(lerp(-12, 12, p))) * d, aim[2]];
      break;
    case "truck": {
      const off = lerp(-1, 1, p) * Math.max(size.frame * 0.7, 0.3);
      position = [position[0] + off, position[1], position[2]];
      target = [target[0] + off, target[1], target[2]];
      break;
    }
    case "crane":
      position = [position[0], position[1] + lerp(0, size.frame * 0.9 + 0.8, p), position[2]];
      break;
    case "handheld": {
      const w = (a: number, b: number) => Math.sin(time * a) * 0.6 + Math.sin(time * b) * 0.4;
      const amp = Math.max(size.frame * 0.012, 0.004);
      target = [target[0] + w(1.3, 2.9) * amp, target[1] + w(1.7, 3.3) * amp, target[2]];
      roll += w(0.9, 2.1) * 0.8;
      break;
    }
  }

  // Over-the-shoulder: the camera sits at the partner's shoulder height,
  // whatever the shot size, looking past their head.
  if (shot.angle === "ots") position = [position[0], Math.max(position[1], 1.7), position[2]];

  // Below the floor (a worm's eye on a long lens): put the camera on the floor
  // but slide it back so it stays as far from what it's aimed at as the shot
  // size asked for. The angle gets a little less steep; the framing holds, so
  // a full shot still has their head in it.
  let floored = false;
  if (position[1] < FLOOR) {
    const reach = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
    const dy = FLOOR - target[1];
    const across = Math.sqrt(Math.max(reach * reach - dy * dy, 0.01));
    let hx = position[0] - target[0], hz = position[2] - target[2];
    const hl = Math.hypot(hx, hz);
    if (hl < 1e-6) { hx = 0; hz = 1; } else { hx /= hl; hz /= hl; }
    position = [target[0] + hx * across, FLOOR, target[2] + hz * across];
    floored = true;
  }

  // Focus sits on the front of the subject (the face, the hand), not the
  // middle of the body: on a long lens the depth of field is a few cm.
  const fz = Math.max(aim[2], FRONT);
  const focus = Math.hypot(aim[0] - position[0], aim[1] - position[1], fz - position[2]);

  // Over-the-shoulder: a second person between camera and subject, facing the
  // subject, a little off the line so their shoulder and the back of their head
  // fill the near edge of the frame. They stand a conversation away (≤1.2m) and
  // at least 0.45m in front of the lens; closer than that there's no room.
  let partner: Rig["partner"] = null;
  if (shot.angle === "ots") {
    const along = Math.min(1.2, d - 0.45);
    if (along > 0.5) {
      const flat = Math.hypot(dir[0], dir[2]);
      const ux = dir[0] / flat, uz = dir[2] / flat;
      const side = -0.25; // to camera-left: their shoulder and the edge of their head frame the left
      partner = {
        position: [ux * along + uz * side, 0, uz * along - ux * side],
        facing: Math.atan2(-ux, -uz),
      };
    }
  }

  return { position, target, focal, roll, focus, partner, floored };
}

/** 0 → 1 → 0 with ease in and out, for a looping move. */
export function movePhase(seconds: number): number {
  const t = (seconds % MOVE_SECONDS) / MOVE_SECONDS;
  const tri = t < 0.5 ? t * 2 : 2 - t * 2;
  return tri * tri * (3 - 2 * tri);
}

export function shotLabel(s: Shot): string {
  return `${SIZES[s.size].abbr} · ${s.lens}mm · f/${s.fStop} · ${ANGLES[s.angle].name} · ${MOVES[s.move].name}`;
}
