/* ============================================================
   The camera view, drawn flat.

   Everything in the scene has a real position in metres; this file
   projects it through the lens (same rig() as the top-down plan) and
   returns flat vector shapes for an SVG. So it looks like an
   illustration but behaves like a camera: framing, compression,
   angle and depth of field are all real.

   - the figure is capsules and balls, drawn as filled "pills" and
     circles, painter-sorted by depth, clay-shaded with a green rim;
   - bright lights become bokeh discs whose size is the real blur
     circle for this lens, focus distance and f-stop;
   - everything else is blurred by the same blur circle, bucketed into
     a fixed set of SVG blur filters so it stays fast while a move plays.
   ============================================================ */

import { blurMm, SENSOR_W_MM } from "./optics";
import type { Rig, Vec3 } from "./shots";

export const W = 1600;
export const H = 900;
const NEAR = 0.03;

/** Gaussian blur levels (px). A shape uses the nearest one. */
export const BLUR_LEVELS = [0, 0.7, 1.4, 2.2, 3.2, 4.5, 6.5, 9, 12, 16, 22, 30];

export type Shape = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** Index into BLUR_LEVELS. */
  blur: number;
  /** Camera-space depth, for sorting. */
  depth: number;
};

/* ---------- camera ---------- */

type Cam = {
  toCam: (p: Vec3) => Vec3;
  proj: (c: Vec3) => [number, number];
  fpx: number;
  blurAt: (dist: number) => number;
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

function camera(r: Rig, fStop: number): Cam {
  const f = norm(sub(r.target, r.position));
  let right = norm(cross(f, [0, 1, 0]));
  let up = cross(right, f);
  const roll = (-r.roll * Math.PI) / 180;
  const c = Math.cos(roll), s = Math.sin(roll);
  [right, up] = [
    [right[0] * c + up[0] * s, right[1] * c + up[1] * s, right[2] * c + up[2] * s],
    [up[0] * c - right[0] * s, up[1] * c - right[1] * s, up[2] * c - right[2] * s],
  ];
  // Pixels per unit at depth 1: half the frame width over tan(half hFOV).
  const fpx = ((W / 2) * r.focal) / (SENSOR_W_MM / 2);
  return {
    fpx,
    toCam: (p) => {
      const v = sub(p, r.position);
      return [dot(v, right), dot(v, up), dot(v, f)];
    },
    proj: ([x, y, z]) => [W / 2 + (x / z) * fpx, H / 2 - (y / z) * fpx],
    blurAt: (dist) => (blurMm(r.focal, fStop, r.focus, dist) / SENSOR_W_MM) * W,
  };
}

function bucket(diameterPx: number): number {
  const sd = diameterPx / 3.2;
  let best = 0;
  for (let i = 1; i < BLUR_LEVELS.length; i++) {
    if (Math.abs(BLUR_LEVELS[i] - sd) < Math.abs(BLUR_LEVELS[best] - sd)) best = i;
  }
  return best;
}

/* ---------- geometry helpers ---------- */

const n1 = (v: number) => Math.round(v * 10) / 10;

/** Clip a camera-space polygon to z ≥ NEAR (Sutherland–Hodgman, one plane). */
function clipNear(poly: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}

function polyPath(cam: Cam, world: Vec3[]): { d: string; depth: number } | null {
  const c = clipNear(world.map(cam.toCam));
  if (c.length < 3) return null;
  const pts = c.map(cam.proj);
  const d = "M" + pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join("L") + "Z";
  return { d, depth: c.reduce((a, p) => a + p[2], 0) / c.length };
}

function circlePath(x: number, y: number, r: number): string {
  return `M${n1(x - r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x + r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x - r)} ${n1(y)}Z`;
}

/** A capsule seen from anywhere: a pill between two projected ends. */
function pillPath(ax: number, ay: number, ra: number, bx: number, by: number, rb: number): string {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy);
  if (L < 0.5) return circlePath(ax, ay, Math.max(ra, rb));
  const nx = -dy / L, ny = dx / L;
  return (
    `M${n1(ax + nx * ra)} ${n1(ay + ny * ra)}` +
    `L${n1(bx + nx * rb)} ${n1(by + ny * rb)}` +
    `A${n1(rb)} ${n1(rb)} 0 0 0 ${n1(bx - nx * rb)} ${n1(by - ny * rb)}` +
    `L${n1(ax - nx * ra)} ${n1(ay - ny * ra)}` +
    `A${n1(ra)} ${n1(ra)} 0 0 0 ${n1(ax + nx * ra)} ${n1(ay + ny * ra)}Z`
  );
}

const onScreen = (x: number, y: number, r: number) => x + r > -50 && x - r < W + 50 && y + r > -50 && y - r < H + 50;

/* ---------- the figure ---------- */

type Part = { a: Vec3; b: Vec3; r: number };

function figureParts(): Part[] {
  const cap = (a: Vec3, b: Vec3, r: number): Part => ({ a, b, r });
  const ball = (c: Vec3, r: number): Part => ({ a: c, b: c, r });
  const parts: Part[] = [
    cap([0, 1.64, 0.01], [0, 1.69, 0.01], 0.093), // head, an egg with no face
    cap([0, 1.47, 0], [0, 1.56, 0], 0.045), // neck
    cap([0, 1.21, 0], [0, 1.37, 0], 0.165), // chest
    ball([0, 1.07, 0], 0.085), // waist
    cap([-0.075, 0.95, 0], [0.075, 0.95, 0], 0.1), // hips
  ];
  for (const x of [1, -1]) {
    parts.push(
      ball([0.205 * x, 1.44, 0], 0.05),
      cap([0.215 * x, 1.4, 0], [0.24 * x, 1.15, 0], 0.045),
      ball([0.245 * x, 1.12, 0], 0.04),
      cap([0.25 * x, 1.09, 0.01], [0.265 * x, 0.87, 0.015], 0.038),
      cap([0.27 * x, 0.86, 0.02], [0.27 * x, 0.75, 0.02], 0.038), // hand (the insert)
      cap([0.262 * x, 0.84, 0.06], [0.25 * x, 0.785, 0.075], 0.016), // thumb
      ball([0.1 * x, 0.88, 0], 0.065),
      cap([0.1 * x, 0.84, 0], [0.1 * x, 0.51, 0], 0.068),
      ball([0.1 * x, 0.47, 0.01], 0.052),
      cap([0.1 * x, 0.43, 0], [0.1 * x, 0.1, 0], 0.052),
      cap([0.1 * x, 0.04, -0.03], [0.1 * x, 0.04, 0.14], 0.04), // foot
    );
  }
  return parts;
}
const FIGURE = figureParts();

function place(p: Vec3, at: Vec3, facing: number): Vec3 {
  const c = Math.cos(facing), s = Math.sin(facing);
  return [at[0] + p[0] * c + p[2] * s, at[1] + p[1], at[2] - p[0] * s + p[2] * c];
}

function figure(cam: Cam, at: Vec3, facing: number, out: Shape[]) {
  for (const part of FIGURE) {
    const a = cam.toCam(place(part.a, at, facing));
    const b = cam.toCam(place(part.b, at, facing));
    if (a[2] < NEAR + part.r || b[2] < NEAR + part.r) continue; // camera is inside it
    const [ax, ay] = cam.proj(a), [bx, by] = cam.proj(b);
    const ra = (part.r * cam.fpx) / a[2], rb = (part.r * cam.fpx) / b[2];
    if (!onScreen((ax + bx) / 2, (ay + by) / 2, Math.hypot(ax - bx, ay - by) + Math.max(ra, rb))) continue;
    const depth = (a[2] + b[2]) / 2;
    const blur = bucket(cam.blurAt(depth));
    const off = Math.max(1, Math.max(ra, rb) * 0.09);
    // Green rim from behind: the same pill, nudged up and right, drawn first.
    out.push({ d: pillPath(ax + off, ay - off * 0.6, ra, bx + off, by - off * 0.6, rb), fill: "#57ff52", opacity: 0.75, blur, depth: depth + 1e-4 });
    out.push({ d: pillPath(ax, ay, ra, bx, by, rb), fill: "url(#svClay)", blur, depth });
  }
}

/* ---------- the set ---------- */

type Strand = { from: Vec3; to: Vec3; sag: number; warm: boolean };
const STRANDS: Strand[] = [
  { from: [-16, 5.2, -9], to: [16, 5.4, -10.5], sag: 1.2, warm: true },
  { from: [-14, 4.2, -12], to: [15, 4.0, -12.5], sag: 0.9, warm: true },
  { from: [-12, 3.4, -7], to: [-1, 3.8, -8], sag: 0.6, warm: false },
  { from: [2, 3.6, -7.5], to: [13, 3.2, -8.5], sag: 0.7, warm: true },
  { from: [-18, 6.5, -14], to: [18, 6.8, -14], sag: 1.6, warm: true },
  { from: [-14, 2.1, -11.5], to: [14, 1.9, -11], sag: 0.35, warm: true },
  { from: [-9, 1.5, -6.5], to: [9, 1.7, -7], sag: 0.25, warm: true },
  { from: [-20, 1.2, -14.5], to: [20, 1.3, -14.5], sag: 0.3, warm: false },
];

const BULBS: { p: Vec3; warm: boolean }[] = STRANDS.flatMap((s) => {
  const len = Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1], s.to[2] - s.from[2]);
  const n = Math.round(len / 0.7);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const p: Vec3 = [
      s.from[0] + (s.to[0] - s.from[0]) * t,
      s.from[1] + (s.to[1] - s.from[1]) * t - s.sag * 4 * t * (1 - t),
      s.from[2] + (s.to[2] - s.from[2]) * t,
    ];
    return { p, warm: s.warm };
  });
});

const NEONS: [Vec3, Vec3][] = [
  [[-6.5, 2.3, -10], [-3.5, 2.3, -10]],
  [[6.2, 0.4, -8], [6.2, 2.8, -8]],
  [[-0.3, 2.9, -13], [1.9, 2.9, -13]],
];

type Box = { c: Vec3; size: Vec3; rotY?: number; tone: "stone" | "crate" };
const BOXES: Box[] = [
  { c: [-2.4, 1.7, -3], size: [0.45, 3.4, 0.45], tone: "stone" },
  { c: [2.8, 1.7, -4.6], size: [0.45, 3.4, 0.45], tone: "stone" },
  { c: [-4.2, 1.7, -7.5], size: [0.45, 3.4, 0.45], tone: "stone" },
  { c: [4.6, 1.7, -9.5], size: [0.45, 3.4, 0.45], tone: "stone" },
  { c: [-7.5, 1.7, -11.5], size: [0.45, 3.4, 0.45], tone: "stone" },
  { c: [8, 1.7, -6], size: [0.45, 3.4, 0.45], tone: "stone" },
  { c: [1.5, 0.35, -1.8], size: [0.7, 0.7, 0.7], tone: "crate" },
  { c: [-1.3, 0.25, -5.2], size: [1, 0.5, 0.6], rotY: 0.5, tone: "crate" },
];
const TONES = {
  stone: { front: "#262a26", side: "#1c1f1c", top: "#343833" },
  crate: { front: "#3d3a34", side: "#2f2c28", top: "#4a463f" },
};

function box(cam: Cam, eye: Vec3, b: Box, out: Shape[]) {
  const [hx, hy, hz] = [b.size[0] / 2, b.size[1] / 2, b.size[2] / 2];
  const rot = b.rotY ?? 0;
  const P = (x: number, y: number, z: number): Vec3 => place([x, y, z], b.c, rot);
  const faces: { pts: Vec3[]; n: Vec3; fill: string }[] = [
    { pts: [P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)], n: [0, 0, 1], fill: TONES[b.tone].front },
    { pts: [P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz)], n: [0, 0, -1], fill: TONES[b.tone].front },
    { pts: [P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz)], n: [1, 0, 0], fill: TONES[b.tone].side },
    { pts: [P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz)], n: [-1, 0, 0], fill: TONES[b.tone].side },
    { pts: [P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz)], n: [0, 1, 0], fill: TONES[b.tone].top },
  ];
  for (const f of faces) {
    const n = place(f.n, [0, 0, 0], rot);
    const mid = f.pts.reduce<Vec3>((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    if (dot(n, sub(eye, mid)) <= 0) continue; // facing away
    const p = polyPath(cam, f.pts);
    if (!p) continue;
    out.push({ d: p.d, fill: f.fill, blur: bucket(cam.blurAt(p.depth)), depth: p.depth });
  }
}

/* ---------- the frame ---------- */

export function drawFrame(r: Rig, fStop: number): { back: Shape[]; items: Shape[] } {
  const cam = camera(r, fStop);
  const back: Shape[] = [];
  const items: Shape[] = [];

  // Back wall with a soft glow on it, then the floor.
  const wall = polyPath(cam, [[-80, 0, -15], [80, 0, -15], [80, 18, -15], [-80, 18, -15]]);
  if (wall) back.push({ d: wall.d, fill: "#0f120f", blur: 0, depth: wall.depth });
  const g = cam.toCam([0, 2.6, -14.9]);
  if (g[2] > NEAR) {
    const [gx, gy] = cam.proj(g);
    back.push({ d: circlePath(gx, gy, (7 * cam.fpx) / g[2]), fill: "url(#svWallGlow)", blur: 0, depth: g[2] });
  }
  const floor = polyPath(cam, [[-300, 0, -15], [300, 0, -15], [300, 0, 300], [-300, 0, 300]]);
  if (floor) back.push({ d: floor.d, fill: "url(#svFloor)", blur: 0, depth: floor.depth });

  // Floor grid: one path per blur level, so a hundred lines cost a dozen filters.
  const grid = new Map<number, string>();
  const seg = (a: Vec3, b: Vec3) => {
    let ca = cam.toCam(a), cb = cam.toCam(b);
    if (ca[2] < NEAR && cb[2] < NEAR) return;
    if (ca[2] < NEAR || cb[2] < NEAR) {
      const t = (NEAR - ca[2]) / (cb[2] - ca[2]);
      const m: Vec3 = [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, NEAR];
      if (ca[2] < NEAR) ca = m; else cb = m;
    }
    const [x1, y1] = cam.proj(ca), [x2, y2] = cam.proj(cb);
    const k = bucket(cam.blurAt((ca[2] + cb[2]) / 2));
    grid.set(k, (grid.get(k) ?? "") + `M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}`);
  };
  for (let x = -20; x <= 20; x++) {
    for (let z = -15; z < 25; z += 5) seg([x, 0.001, z], [x, 0.001, z + 5]);
  }
  for (let z = -15; z <= 25; z++) {
    for (let x = -20; x < 20; x += 5) seg([x, 0.001, z], [x + 5, 0.001, z]);
  }
  for (const [k, d] of grid) back.push({ d, stroke: "#ffffff", strokeWidth: 1.2, opacity: 0.05, blur: k, depth: 0 });

  // Contact shadows on the floor.
  const shadow = (at: Vec3) => {
    const ring: Vec3[] = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      return [at[0] + Math.cos(a) * 0.5, 0.002, at[2] + Math.sin(a) * 0.32];
    });
    const p = polyPath(cam, ring);
    if (p) back.push({ d: p.d, fill: "#000000", opacity: 0.5, blur: Math.min(bucket(cam.blurAt(p.depth)) + 3, BLUR_LEVELS.length - 1), depth: p.depth });
  };
  shadow([0, 0, 0]);
  if (r.partner) shadow(r.partner.position);

  for (const b of BOXES) box(cam, r.position, b, items);

  // Practical lights: a disc the size of the real blur circle.
  for (const b of BULBS) {
    const c = cam.toCam(b.p);
    if (c[2] < NEAR + 0.05) continue;
    const [x, y] = cam.proj(c);
    const rp = Math.max((0.045 * cam.fpx) / c[2], 0.8);
    const re = Math.max(rp, cam.blurAt(c[2]) / 2);
    if (!onScreen(x, y, re * 2.4)) continue;
    const spread = (rp / re) ** 2;
    items.push({ d: circlePath(x, y, re * 2.4), fill: b.warm ? "url(#svHaloWarm)" : "url(#svHaloGreen)", opacity: 0.35, blur: 0, depth: c[2] + 1e-3 });
    items.push({ d: circlePath(x, y, re), fill: b.warm ? "url(#svBokehWarm)" : "url(#svBokehGreen)", opacity: Math.min(1, 0.5 + spread), blur: 0, depth: c[2] });
  }

  for (const [a, b] of NEONS) {
    const ca = cam.toCam(a), cb = cam.toCam(b);
    if (ca[2] < NEAR || cb[2] < NEAR) continue;
    const [x1, y1] = cam.proj(ca), [x2, y2] = cam.proj(cb);
    const depth = (ca[2] + cb[2]) / 2;
    const wpx = Math.max((0.06 * cam.fpx) / depth, 1.5);
    const blur = bucket(cam.blurAt(depth));
    const d = `M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}`;
    // Glow, then the tube; both defocus with the rest of the frame.
    items.push({ d, stroke: "#57ff52", strokeWidth: wpx * 3, opacity: 0.22, blur: Math.min(blur + 3, BLUR_LEVELS.length - 1), depth: depth + 1e-3 });
    items.push({ d, stroke: "#c8ffc5", strokeWidth: wpx, opacity: 0.95, blur, depth });
  }

  figure(cam, [0, 0, 0], 0, items);
  if (r.partner) figure(cam, r.partner.position, r.partner.facing, items);

  items.sort((a, b) => b.depth - a.depth);
  return { back, items };
}
