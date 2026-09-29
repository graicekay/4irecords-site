/* ============================================================
   The camera view, drawn flat.

   Each location (scenes.ts) is a paper diorama, shot through a real
   lens. Everything has a real position in metres; this file projects
   it through the lens (same rig() as the top-down plan) and returns
   flat shapes for an SVG. So it looks like cut paper but behaves like
   a camera: framing, compression, angle and depth of field are real.

   - colours come from one palette, worked out from day/night and the
     accent: 4i ink, off-white paper, and the accent mixed into both;
   - cut-paper flats and props get a soft paper shadow and a lit top
     edge (the accent at night, paper in the day);
   - the figure is a flat illustrated person: hair, coat, trousers,
     a small accent scarf, one cut-paper outline, no shading;
   - lights are the only things that aren't paper. In focus they're
     small shapes; out of focus they spread into bokeh discs the size
     of the real blur circle.
   ============================================================ */

import { blurMm, SENSOR_W_MM } from "./optics";
import type { Rig, Vec3 } from "./shots";
import { scene as getScene, type Look, type Scene, type When, type Box, type Flat } from "./scenes";

export const W = 1600;
export const H = 900;
const NEAR = 0.03;

/** Gaussian blur levels (px). A shape uses the nearest one. */
// Up to 75px (15 of the 320-wide pixel frame): wide-open lenses really blur a
// far background by several percent of the frame, so the ceiling has to be high.
export const BLUR_LEVELS = [0, 0.7, 1.4, 2.2, 3.2, 4.5, 6.5, 9, 12, 16, 22, 30, 40, 55, 75];

export const INK = "#0a0a0a";
export const PAPER = "#f0f0f0";

export type Glow = "accent" | "paper" | "pool" | "sun" | "warm" | "ember";

export type Shape = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** Light adds up; paper doesn't. */
  blend?: "screen";
  /** Part of a figure sprite (0 = the subject, 1 = the over-the-shoulder partner). */
  group?: number;
  /** A step of the pixel palette's ramp to fill with (0 = ink), instead of `fill`. */
  ramp?: number;
  /** A step of the pixel palette's accent family (0 darkest), instead of `fill`. */
  accentStep?: number;
  /** A material with its own colours (bark, dirt), instead of the location's ramp. */
  material?: string;
  /** An eye's centre (px): the sprite also stamps it onto its grid as solid pixels. */
  eye?: [number, number];
  /** A figure face's highest and lowest points in the world, on screen (x1, y1, x2, y2): its shading falls off along it. */
  shadeLine?: [number, number, number, number];
  /** A figure part: the pixel palette's colour for it (the figure keeps its own colours). */
  region?: Region;
  /** A building's facade by day: which of the location's facade colours, and its haze. */
  facade?: [number, number];
  /** A sun (or moon) ring, 0 outermost: the pixel palette's colour for it. */
  sunRing?: number;
  /** Steps lighter (+) or darker (−) than its ramp/accent step: a box face's shading. */
  shadeStep?: number;
  /** 0–1 of the next lighter shade mixed in: the pixel dither turns it into a dot texture. */
  dither?: number;
  /** A fog band: screen y (px) of the layer's top and base; it lightens toward the base. */
  fog?: [number, number];
  /** A cut-paper layer's distance, 0 near → 1 far: pixel art gives each its own shade step. */
  haze?: number;
  /** A radial glow instead of a flat fill: which one, its centre and radii (px). */
  grad?: { id: Glow; x: number; y: number; rx: number; ry: number };
  /** Index into BLUR_LEVELS. */
  blur: number;
  /** Camera-space depth, for sorting. */
  depth: number;
};

/** -1..1, stable for the same inputs. */
function hash(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
}

/* ---------- palette ---------- */

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

const GREEN = "#57ff52";
/** The warm light the pixel refs pair with cool shadows ("a little more leeway"). */
export const WARM = "#ffc978";
/** Ember orange: soft glowing lights in the dark (the forest's fireflies). */
export const EMBER = "#ff9a3c";
/** Safety-line paint: yellow, whatever the accent (it's paint, not light). */
export const PAINT = "#e0b53f";
/**
 * Pinned colours were designed as neutral grey + some 4i green. Split one back
 * into those two and swap the green for another accent. Green returns it as is.
 */
export function retint(hex: string, accent: string): string {
  if (accent === GREEN) return hex;
  const [r, g] = rgb(hex);
  const [gr, gg] = rgb(GREEN);
  const k = Math.max(0, Math.min(1, (g - r) / (gg - gr)));
  const n = Math.round(Math.max(0, (r - gr * k) / (1 - k || 1)));
  const grey = "#" + n.toString(16).padStart(2, "0").repeat(3);
  return mix(grey, accent, k);
}

export type Palette = {
  night: boolean;
  /** A pinned night colour (designed with 4i green), re-tinted for this accent. */
  pin: (hex: string) => string;
  accent: string;
  sky: string;
  /** Sun rings, outermost first; the last is the disc. */
  rings: string[];
  /** A cut-paper flat at haze t (0 near → 1 far). */
  layer: (t: number) => string;
  /** Ground, walls and props at a shade (0 dark → 1 light). */
  tone: (s: number) => string;
  edge: string;
  edgeOpacity: number;
  shadowOpacity: number;
  pane: string;
  paneLight: boolean;
  /** Warm practicals (street lamps, bulbs): the pixel palette's second light colour. */
  warm: string;
};

export function palette(look: Look): Palette {
  const a = look.accent;
  if (look.time === "night") {
    return {
      night: true,
      pin: (hex) => retint(hex, a),
      accent: a,
      sky: INK,
      rings: [0.05, 0.08, 0.12, 0.18, 0.26].map((k) => mix(INK, a, k)).concat(a),
      layer: (t) => mix("#0c0d0c", a, 0.02 + 0.2 * t ** 1.2),
      tone: (s) => mix(mix("#0a0b0a", "#454944", s), a, 0.03),
      edge: a,
      edgeOpacity: 0.5,
      shadowOpacity: 0.55,
      pane: mix(INK, a, 0.16),
      paneLight: false,
      warm: WARM,
    };
  }
  const sky = mix(PAPER, a, 0.1);
  const near = mix(PAPER, INK, 0.62), far = mix(sky, INK, 0.1);
  return {
    night: false,
    pin: (hex) => hex,
    accent: a,
    sky,
    rings: [0.14, 0.19, 0.26, 0.35, 0.48].map((k) => mix(PAPER, a, k)).concat(a),
    layer: (t) => mix(near, far, t ** 0.9),
    tone: (s) => mix(mix("#464846", "#e8e9e5", s), a, 0.03),
    edge: "#ffffff",
    edgeOpacity: 0.55,
    shadowOpacity: 0.28,
    pane: "#ffffff",
    paneLight: true,
    warm: "#ffffff",
  };
}

const isOn = (on: When, p: Palette) => on === "always" || (on === "night") === p.night;

/* ---------- camera ---------- */

type Cam = {
  toCam: (p: Vec3) => Vec3;
  proj: (c: Vec3) => [number, number];
  fpx: number;
  eye: Vec3;
  blurAt: (dist: number) => number;
  /** Screen direction of world "up", for edge light and paper shadows. */
  up: [number, number];
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
  if (Math.hypot(...right) < 0.5) right = [1, 0, 0];
  let up = cross(right, f);
  const roll = (-r.roll * Math.PI) / 180;
  const c = Math.cos(roll), s = Math.sin(roll);
  [right, up] = [
    [right[0] * c + up[0] * s, right[1] * c + up[1] * s, right[2] * c + up[2] * s],
    [up[0] * c - right[0] * s, up[1] * c - right[1] * s, up[2] * c - right[2] * s],
  ];
  // Pixels per unit at depth 1: half the frame width over tan(half hFOV).
  const fpx = ((W / 2) * r.focal) / (SENSOR_W_MM / 2);
  // World up on screen: its x and y components in camera space.
  const ul = Math.hypot(right[1], up[1]) || 1;
  return {
    fpx,
    eye: r.position,
    up: [right[1] / ul, -up[1] / ul],
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
const soften = (b: number, by: number) => Math.min(b + by, BLUR_LEVELS.length - 1);

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

/**
 * `flat`: draw with flattened perspective (a figure drawn like a 2D sprite):
 * every point's depth is pulled toward depth `z` by `keep` (0 = no
 * perspective within the figure, 1 = true perspective). It still moves and
 * scales correctly with the camera; only its own shape tapers less.
 */
function project(cam: Cam, world: Vec3[], flat?: { z: number; keep: number }): { pts: [number, number][]; depth: number } | null {
  const c = clipNear(world.map(cam.toCam));
  if (c.length < 3) return null;
  const pts = flat
    ? c.map(([px, py, pz]) => cam.proj([px, py, Math.max(NEAR, flat.z + (pz - flat.z) * flat.keep)]))
    : c.map(cam.proj);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < -80 || x0 > W + 80 || y1 < -80 || y0 > H + 80) return null;
  return { pts, depth: c.reduce((a, p) => a + p[2], 0) / c.length };
}

/** Centre and half-size of a projected polygon. */
function bounds(pts: [number, number][]): { x: number; y: number; rx: number; ry: number } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 };
}

const toPath = (pts: [number, number][], dx = 0, dy = 0) =>
  "M" + pts.map(([x, y]) => `${n1(x + dx)} ${n1(y + dy)}`).join("L") + "Z";

function circlePath(x: number, y: number, r: number): string {
  return `M${n1(x - r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x + r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x - r)} ${n1(y)}Z`;
}

const onScreen = (x: number, y: number, r: number) => x + r > -50 && x - r < W + 50 && y + r > -50 && y - r < H + 50;

/* ---------- light ---------- */

/**
 * A point of light: a small sharp dot in focus, a bokeh disc the size of the
 * real blur circle out of focus. The disc keeps (most of) the light's
 * energy, so a small far light spreads into a fainter disc.
 */
function light(cam: Cam, p: Vec3, sizeM: number, color: string, glowId: Glow, out: Shape[], glow: number, floor = 0.3, night = false) {
  const c = cam.toCam(p);
  if (c[2] < NEAR + 0.05) return;
  const [x, y] = cam.proj(c);
  // At night a light is at least a pixel and a half (7.5 of 1600), so it reads.
  const rp = Math.max((sizeM * cam.fpx) / c[2], night ? 3.8 : 0.9);
  const re = Math.max(rp, cam.blurAt(c[2]) / 2);
  const reach = night ? 3.4 : 2.6;
  if (!onScreen(x, y, re * reach)) return;
  const energy = Math.min(1, Math.max(floor, (rp / re) ** 2 * 1.6));
  if (glow) out.push({ d: circlePath(x, y, re * reach), grad: { id: glowId, x, y, rx: re * reach, ry: re * reach }, opacity: glow * (0.5 + energy / 2), blend: "screen", blur: 0, depth: c[2] + 2e-3 });
  out.push({ d: circlePath(x, y, re), fill: color, opacity: energy, blend: "screen", blur: re > rp * 1.4 ? 1 : 0, depth: c[2] });
  // A bright light in focus at night gets a pixel sparkle: a one-pixel plus.
  if (night && glow >= 0.5 && energy > 0.7) {
    const arm = Math.max(12, rp * 2.4), t = 2.6;
    out.push({ d: `M${n1(x - arm)} ${n1(y - t)}h${n1(arm * 2)}v${n1(t * 2)}h${n1(-arm * 2)}Z M${n1(x - t)} ${n1(y - arm)}h${n1(t * 2)}v${n1(arm * 2)}h${n1(-t * 2)}Z`, fill: color, opacity: 0.75, blend: "screen", blur: 0, depth: c[2] - 1e-3 });
  }
}

/* ---------- drawing the scene ---------- */

type Ctx = { cam: Cam; pal: Palette; back: Shape[]; items: Shape[] };

const halo = (color: string, pal: Palette): Glow =>
  color === pal.accent ? "accent" : color === EMBER ? "ember" : color === pal.warm && pal.night ? "warm" : "paper";

/** A cut-paper polygon: soft shadow, lit top edge, then the paper. */
function paper(x: Ctx, world: Vec3[], fill: string, edge: number, shadow = true, haze?: number, fog?: [number, number], material?: string) {
  const p = project(x.cam, world);
  if (!p) return;
  const [ux, uy] = x.cam.up;
  const blur = bucket(x.cam.blurAt(p.depth));
  if (shadow) x.items.push({ d: toPath(p.pts, -ux * 7, -uy * 7), fill: "#000", opacity: x.pal.shadowOpacity, blur: soften(blur, 5), depth: p.depth + 0.3 });
  if (edge) x.items.push({ d: toPath(p.pts, ux * 2.2, uy * 2.2), fill: x.pal.edge, opacity: edge, blur, depth: p.depth + 0.2 });
  x.items.push({ d: toPath(p.pts), fill, haze, fog, material, blur, depth: p.depth });
}

function sun(x: Ctx, s: NonNullable<Scene["sun"]>) {
  const { cam, pal } = x;
  const c = cam.toCam(s.c);
  if (c[2] < 1) return;
  const [sx, sy] = cam.proj(c);
  const k = cam.fpx / c[2];
  const blur = bucket(cam.blurAt(c[2]));
  const rings = pal.night && s.nightRings ? s.nightRings.map(pal.pin) : pal.rings;
  // The approved city (pinned rings) draws its night rings among the flats, over the
  // road, as it always did; its sun is high enough that it reads fine. Everywhere
  // else the sky goes behind the ground.
  const inFront = pal.night && !!s.nightRings;
  const [list, base] = inFront ? [x.items, c[2] + 10] : [x.back, 3e6];
  // Away from the city, the night sky gets a moon: smaller than the day's sun.
  const scale = pal.night && !s.nightRings ? 0.45 : 1;
  [5.2, 3.7, 2.6, 1.85, 1.35, 1].forEach((m, i) => {
    const r = s.r * m * k * scale;
    if (!onScreen(sx, sy, r)) return;
    // Each ring is a paper disc with a soft shadow on the ring behind.
    // Cut as a 64-sided disc, like scissors round a template.
    const disc: [number, number][] = Array.from({ length: 64 }, (_, j) => [sx + Math.cos((j / 64) * Math.PI * 2) * r, sy + Math.sin((j / 64) * Math.PI * 2) * r]);
    if (i > 0) list.push({ d: toPath(disc, 0, 3), fill: "#000", opacity: pal.night ? 0.35 : 0.08, blur: soften(blur, 4), depth: base - i });
    list.push({ d: toPath(disc), fill: rings[i], sunRing: i, blur, depth: base - i - 0.5 });
  });
  // The sun lights the air around it.
  list.push({ d: circlePath(sx, sy, s.r * 3 * k * scale), grad: { id: "sun", x: sx, y: sy, rx: s.r * 3 * k * scale, ry: s.r * 3 * k * scale }, opacity: pal.night ? 0.4 : 0.3, blend: "screen", blur: 0, depth: inFront ? c[2] - 1 : 2e6 });
}

function flat(x: Ctx, f: Flat) {
  const { cam, pal } = x;
  const tone = pal.night && f.night ? pal.pin(f.night) : pal.layer(f.t);
  const edge = pal.night && f.edge !== undefined ? f.edge : pal.edgeOpacity + 0.15 * f.t;
  // Its fog band: from the layer's top down to its base, it lightens.
  const base = cam.toCam([0, 0, f.z()]), topP = cam.toCam([0, f.top ?? 20, f.z()]);
  const fog: [number, number] | undefined = base[2] > NEAR && topP[2] > NEAR ? [cam.proj(topP)[1], cam.proj(base)[1]] : undefined;
  for (const poly of f.polys) paper(x, poly, tone, edge, true, f.t, fog);
  for (const poly of f.details ?? []) paper(x, poly, tone, 0, false, f.t, fog);
  // By day, the nearer buildings each get a facade colour (ref 01's cream, brick, slate…).
  if (!pal.night && f.blocks && f.t <= 0.5) {
    f.blocks.forEach((b, i) => {
      const z = f.z() + 0.005;
      const p = project(cam, [[b.side * b.x0, -0.5, z], [b.side * b.x1, -0.5, z], [b.side * b.x1, b.bh, z], [b.side * b.x0, b.bh, z]]);
      if (p) x.items.push({ d: toPath(p.pts), fill: tone, facade: [Math.abs(Math.round(hash(i, Math.round(f.t * 10), 7) * 1000)) % 4, f.t], blur: bucket(cam.blurAt(p.depth)), depth: p.depth - 0.002 });
    });
  }
  // Each building's shadow side, a step darker (drawn over the flat, under its windows).
  for (const poly of f.shade ?? []) {
    const p = project(cam, poly);
    if (p) x.items.push({ d: toPath(p.pts), fill: tone, haze: Math.max(0, f.t - 0.17), fog, blur: bucket(cam.blurAt(p.depth)), depth: p.depth - 0.005 });
  }
  // Windows. Night: lit, some in the accent. Day: cut a shade darker into the
  // paper, a few catching the sun. Factory panes: bright by day, dark at night.
  type Kind = "light" | "cut";
  const sharp = new Map<string, string>();
  for (const w of f.windows) {
    let color: string, kind: Kind;
    if (w.pane) [color, kind] = pal.night ? [pal.pane, "cut"] : ["#ffffff", "light"];
    else if (w.unlit) [color, kind] = [INK, "cut"];
    else if (pal.night) [color, kind] = [(w.accent ?? w.r < 0.2) ? pal.accent : w.r < 0.6 ? pal.warm : PAPER, "light"];
    else [color, kind] = w.r < 0.12 ? ["#ffffff", "light"] : [INK, "cut"];
    const c = cam.toCam(w.p);
    if (c[2] < NEAR) continue;
    const [px, py] = cam.proj(c);
    const k = cam.fpx / c[2];
    const bw = (w.w * k) / 2, bh = (w.h * k) / 2;
    if (!onScreen(px, py, Math.max(bw, bh) * 3)) continue;
    if (w.unlit && bw < 1.5) continue; // smaller than a pixel: skip
    const blurPx = cam.blurAt(c[2]);
    if (w.pane || kind === "cut" || (blurPx < Math.min(bw, bh) * 2 && bw > 0.6)) {
      const key = `${kind}|${color}|${bucket(blurPx)}`;
      sharp.set(key, (sharp.get(key) ?? "") + `M${n1(px - bw)} ${n1(py - bh)}h${n1(bw * 2)}v${n1(bh * 2)}h${n1(-bw * 2)}Z`);
    } else {
      light(cam, w.p, Math.min(w.w, w.h) / 2, color, halo(color, pal), x.items, 0, 0.3, pal.night);
    }
  }
  const d0 = cam.toCam(f.polys[0][0])[2] - 0.01;
  for (const [key, d] of sharp) {
    const [kind, color, b] = key.split("|");
    x.items.push(kind === "cut"
      ? { d, fill: color, opacity: color === INK ? (pal.night ? 0.3 : 0.32) : 1, blur: +b, depth: d0 }
      : { d, fill: color, opacity: color === pal.accent ? 0.85 : 0.8, blend: "screen", blur: +b, depth: d0 });
  }
  if (pal.night) for (const [a, b] of f.neon) neonTube(x, a, b);
}

function neonTube(x: Ctx, a: Vec3, b: Vec3) {
  const { cam, pal } = x;
  const ca = cam.toCam(a), cb = cam.toCam(b);
  if (ca[2] < NEAR || cb[2] < NEAR) return;
  const [x1, y1] = cam.proj(ca), [x2, y2] = cam.proj(cb);
  const depth = (ca[2] + cb[2]) / 2 - 0.02;
  const wpx = Math.max((0.12 * cam.fpx) / depth, 1.2);
  const blur = bucket(cam.blurAt(depth));
  const d = `M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}`;
  x.items.push({ d, stroke: pal.accent, strokeWidth: wpx * 4, opacity: 0.25, blend: "screen", blur: soften(blur, 3), depth: depth + 1e-3 });
  x.items.push({ d, stroke: pal.pin("#d6ffd4"), strokeWidth: wpx, opacity: 0.95, blend: "screen", blur, depth });
}

function place(p: Vec3, at: Vec3, facing: number): Vec3 {
  const c = Math.cos(facing), s = Math.sin(facing);
  return [at[0] + p[0] * c + p[2] * s, at[1] + p[1], at[2] - p[0] * s + p[2] * c];
}

/** A folded paper box: three tones of the same card, lit top. */
function box(x: Ctx, b: Box) {
  const { cam, pal } = x;
  const [hx, hy, hz] = [b.size[0] / 2, b.size[1] / 2, b.size[2] / 2];
  const rot = b.rotY ?? 0;
  const P = (px: number, py: number, pz: number): Vec3 => place([px, py, pz], b.c, rot);
  const faces: { pts: Vec3[]; n: Vec3; s: number }[] = [
    { pts: [P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)], n: [0, 0, 1], s: 0 },
    { pts: [P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz)], n: [0, 0, -1], s: 0 },
    { pts: [P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz)], n: [1, 0, 0], s: -0.08 },
    { pts: [P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz)], n: [-1, 0, 0], s: -0.08 },
    { pts: [P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz)], n: [0, 1, 0], s: 0.14 },
  ];
  for (const f of faces) {
    const n = place(f.n, [0, 0, 0], rot);
    const mid = f.pts.reduce<Vec3>((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    if (dot(n, sub(cam.eye, mid)) <= 0) continue; // facing away
    const p = project(cam, f.pts);
    if (!p) continue;
    const fill = pal.night && b.night ? pal.pin(b.night[f.s < 0 ? 1 : f.s > 0 ? 2 : 0]) : pal.tone(b.shade + f.s);
    x.items.push({ d: toPath(p.pts), fill, blur: bucket(cam.blurAt(p.depth)), depth: p.depth });
  }
}

function ground(x: Ctx, s: Scene) {
  const { cam, pal } = x;
  // Painted marks of the same blur and colour share one path.
  const marks = new Map<string, string>();
  s.ground.forEach((g, i) => {
    if (g.n && dot(g.n, sub(cam.eye, g.pts[0])) <= 0) return;
    const p = project(cam, g.pts);
    if (!p) return;
    // Ground planes stay sharp (their average depth means nothing); marks blur.
    const blur = g.mark ? bucket(cam.blurAt(p.depth)) : 0;
    if (g.mark) {
      const key = `${g.mark}|${g.opacity ?? 1}|${blur}`;
      marks.set(key, (marks.get(key) ?? "") + toPath(p.pts));
    } else {
      x.back.push({ d: toPath(p.pts), fill: pal.night && g.night ? pal.pin(g.night) : pal.tone(g.shade), opacity: g.opacity, dither: g.dither, material: g.material, blur, depth: 1e6 - i });
    }
  });
  for (const [key, d] of marks) {
    const [kind, op, b] = key.split("|");
    x.back.push({ d, fill: kind === "accent" ? pal.accent : kind === "paint" ? PAINT : pal.night ? PAPER : "#ffffff", opacity: +op * (pal.night ? 1 : 0.9), blur: +b, depth: 1e5 });
  }
  for (const pool of s.pools) {
    if (!isOn(pool.on, pal)) continue;
    const ring: Vec3[] = Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return [pool.c[0] + Math.cos(a) * pool.r, 0.003, pool.c[2] + Math.sin(a) * pool.r];
    });
    const p = project(cam, ring);
    if (p) x.back.push({ d: toPath(p.pts), grad: { id: "pool", ...bounds(p.pts) }, opacity: 0.55, blend: "screen", blur: soften(bucket(cam.blurAt(p.depth)), 2), depth: 1e4 });
  }
}

/* ---------- wires and reflections ---------- */

/** An overhead wire: a sagging line one pixel thick, with the odd bird on it. */
function wire(x: Ctx, w: Scene["wires"][number]) {
  const { cam } = x;
  const at = (t: number): Vec3 => [
    w.from[0] + (w.to[0] - w.from[0]) * t,
    w.from[1] + (w.to[1] - w.from[1]) * t - w.sag * 4 * t * (1 - t),
    w.from[2] + (w.to[2] - w.from[2]) * t,
  ];
  const pts: [number, number][] = [];
  let depth = 0, n = 0;
  for (let i = 0; i <= 16; i++) {
    const c = cam.toCam(at(i / 16));
    if (c[2] < NEAR + 0.1) continue;
    pts.push(cam.proj(c));
    depth += c[2];
    n++;
  }
  if (n < 2) return;
  depth /= n;
  const d = "M" + pts.map(([px, py]) => `${n1(px)} ${n1(py)}`).join("L");
  const blur = bucket(cam.blurAt(depth));
  x.items.push({ d, stroke: INK, strokeWidth: Math.max(5, (0.03 * cam.fpx) / depth), blur, depth });
  // Birds: a body and a head, two pixels and one.
  for (let b = 0; b < (w.birds ?? 0); b++) {
    const c = cam.toCam(at(0.3 + b * 0.09));
    if (c[2] < NEAR + 0.1) continue;
    const [bx, by] = cam.proj(c);
    const k = Math.max(5, (0.12 * cam.fpx) / c[2]);
    x.items.push({ d: `M${n1(bx - k / 2)} ${n1(by - k * 1.4)}h${n1(k)}v${n1(k * 1.4)}h${n1(-k)}Z M${n1(bx - k * 0.2)} ${n1(by - k * 2.2)}h${n1(k * 0.6)}v${n1(k * 0.8)}h${n1(-k * 0.6)}Z`, fill: INK, blur, depth: c[2] - 0.01 });
  }
}

/** A wet road or polished floor: each light again, upside down, as a stretched streak. */
function reflections(x: Ctx, s: Scene) {
  const { cam, pal } = x;
  for (const l of s.lights) {
    if (!isOn(l.on, pal) || l.dim || l.p[1] > 9) continue;
    const c = cam.toCam([l.p[0], -l.p[1], l.p[2]]);
    if (c[2] < NEAR + 0.1) continue;
    const [px, py] = cam.proj(c);
    const r = Math.max((l.size * cam.fpx) / c[2], 2.5, cam.blurAt(c[2]) / 2);
    if (!onScreen(px, py, r * 4)) continue;
    const color = l.accent ? pal.accent : pal.night ? (l.warm ? pal.warm : PAPER) : "#ffffff";
    x.back.push({ d: `M${n1(px - r)} ${n1(py - r * 3)}h${n1(r * 2)}v${n1(r * 6)}h${n1(-r * 2)}Z`, fill: color, opacity: 0.3, blend: "screen", blur: soften(bucket(cam.blurAt(c[2])), 1), depth: 1e4 - 1 });
  }
}

/* ---------- the figure ----------

   After the pixel refs' people (the bob-haired girl in 07, the man in 04),
   and built like everything else in the world: out of boxes. Square head, a
   blocky bob (top, back, sides and fringe slabs), a boxy oversized hoodie with
   square shoulders, box limbs and chunky box sneakers. Shading comes from the
   boxes' own faces, the way the crates are lit: tops a step lighter, faces
   turned from the light a step darker. Two pixel eyes that blink, and a phone in
   the right hand at chest height, screen toward the face (so the insert has
   something in hand). Everything in metres, so every angle and lens is true.

   The 3D is only the guide. It's drawn like a 2D pixel sprite: perspective
   within the figure mostly flattened (FIGURE_PERSPECTIVE), and pixel.ts
   shades each face in dithered bands, darkens the silhouette's edge pixels
   (no black stroke) and lights its top edges, all at the frame's own pixel
   size, so moves stay smooth (Grace: "cheat the 3d look… keeping the pixel
   vibe").
   ---------------------------------------------------------------------- */

export type Region = "hair" | "skin" | "nose" | "hood" | "sleeve" | "pocket" | "trousers" | "shoes" | "sole" | "eyes" | "phone" | "line";
/** A box from a to b (its long axis), `w` across and `d` deep, in one region. */
type Block = { a: Vec3; b: Vec3; w: number; d: number; c: Region };

/** Where the phone is: in the right hand, screen tilted back toward the face. */
export const PHONE = { c: [0.13, 1.1, 0.24] as Vec3, w: 0.076, h: 0.156, tilt: 0.95 };
/** The face's front plane (m, +z from the head's centre line), where the eyes sit. */
const FACE_Z = 0.117;

const BODY: Block[] = (() => {
  const B = (a: Vec3, b: Vec3, w: number, d: number, c: Region): Block => ({ a, b, w, d, c });
  const out: Block[] = [
    // Head and a blocky bob.
    B([0, 1.53, 0.005], [0, 1.79, 0.005], 0.22, 0.22, "skin"),
    B([0, 1.76, -0.005], [0, 1.845, -0.005], 0.25, 0.25, "hair"), // top
    B([0, 1.55, -0.105], [0, 1.8, -0.105], 0.25, 0.05, "hair"), // back
    // Sides to ear level, set back from the face, so they don't frame it like an outline.
    B([-0.12, 1.65, -0.04], [-0.12, 1.8, -0.04], 0.03, 0.17, "hair"),
    B([0.12, 1.65, -0.04], [0.12, 1.8, -0.04], 0.03, 0.17, "hair"),
    B([0.01, 1.72, FACE_Z], [0.01, 1.8, FACE_Z], 0.24, 0.028, "hair"), // fringe
    B([0, 1.615, FACE_Z + 0.02], [0, 1.66, FACE_Z + 0.02], 0.036, 0.04, "nose"), // a small nose: the face has depth, so a fisheye bends it
    B([0, 1.42, 0], [0, 1.54, 0], 0.085, 0.085, "skin"), // neck
    // Boxy oversized hoodie, square shoulders, the hood bunched behind the neck.
    B([0, 0.86, 0], [0, 1.43, 0], 0.44, 0.25, "hood"),
    B([0, 1.36, -0.15], [0, 1.5, -0.12], 0.26, 0.09, "hood"),
    B([0, 0.93, 0.13], [0, 1.07, 0.13], 0.24, 0.02, "pocket"),
    // Left arm hangs.
    B([-0.28, 0.9, 0], [-0.28, 1.42, 0], 0.11, 0.12, "sleeve"),
    B([-0.28, 0.8, 0.01], [-0.28, 0.9, 0.01], 0.075, 0.075, "skin"),
    // Right arm bends up to hold the phone.
    B([0.28, 1.1, 0.01], [0.28, 1.42, 0], 0.11, 0.12, "sleeve"),
    B([0.28, 1.13, 0.03], [0.16, 1.06, 0.2], 0.1, 0.1, "sleeve"),
    B([0.15, 1.03, 0.18], [0.15, 1.1, 0.2], 0.07, 0.065, "skin"), // hand, on the phone's lower corner
  ];
  for (const x of [-0.09, 0.09]) {
    out.push(
      B([x, 0.12, 0], [x, 0.87, 0], 0.13, 0.14, "trousers"),
      B([x, 0.04, -0.07], [x, 0.04, 0.18], 0.1, 0.14, "shoes"), // long axis forward: w is height here
      B([x, 0.008, -0.08], [x, 0.008, 0.19], 0.018, 0.15, "sole"),
    );
  }
  return out;
})();

/** How much of the figure's own perspective is kept (the rest is flattened, sprite-like). */
const FIGURE_PERSPECTIVE = 0.35;

/** The light the figure's faces are shaded by: high, from the front left. */
const KEY: Vec3 = norm([-0.55, 0.6, 0.6]);

function figure(x: Ctx, at: Vec3, facing: number, blink: boolean, group: number, figures: Frame["figures"]) {
  const { cam, pal } = x;
  // Shadow on the ground: long toward the camera by day (the sun's behind), a pool at night.
  const ring: Vec3[] = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return pal.night
      ? [at[0] + Math.cos(a) * 0.45, 0.008, at[2] + Math.sin(a) * 0.3]
      : [at[0] + Math.cos(a) * 0.3, 0.008, at[2] + 0.95 + Math.sin(a) * 1.05];
  });
  const sh = project(cam, ring);
  if (sh) x.back.push({ d: toPath(sh.pts), fill: "#000", opacity: pal.night ? 0.6 : 0.3, blur: soften(bucket(cam.blurAt(sh.depth)), 3), depth: 1e3 });

  const toEye = sub(cam.eye, at);
  // Drawn like a 2D sprite: perspective within the figure is mostly flattened
  // (a little kept, so a 14mm close-up still bends the face).
  const chestZ = cam.toCam(place([0, 1.2, 0], at, facing))[2];
  const flat = chestZ > NEAR ? { z: chestZ, keep: FIGURE_PERSPECTIVE } : undefined;
  // Eyes: two small black boxes standing proud of the face, never smaller
  // than one sprite pixel wide and two tall (one when blinking), so they read
  // as crisp pixel eyes at any size. The sprite pixel matches pixel.ts.
  const heightPx = chestZ > NEAR ? (1.83 * cam.fpx) / chestZ : 1;
  const spriteM = chestZ > NEAR ? ((Math.max(1, Math.min(6, (heightPx * (320 / W)) / 64)) / (320 / W)) * chestZ) / cam.fpx : 0.03;
  const ew = Math.max(0.022, spriteM * 1.05), eh = blink ? Math.max(0.006, spriteM * 1.05) : Math.max(0.028, spriteM * 2.05);
  const eyes: Block[] = [-0.045, 0.045].map((ex) => ({ a: [ex, 1.666 - eh / 2, FACE_Z + 0.004], b: [ex, 1.666 + eh / 2, FACE_Z + 0.004], w: ew, d: 0.012, c: "eyes" }));
  // Every visible face of every box, shaded by which way it faces.
  const faces: { pts: [number, number][]; depth: number; c: Region; shade: number; line?: [number, number, number, number]; blur: number }[] = [];
  // A single point through the same flattened projection as the faces.
  const flatProj = (w: Vec3): [number, number] => {
    const c = cam.toCam(w);
    return cam.proj([c[0], c[1], flat ? Math.max(NEAR, flat.z + (c[2] - flat.z) * flat.keep) : Math.max(NEAR, c[2])]);
  };
  for (const bl of [...BODY, ...eyes]) {
    const u = norm(sub(bl.b, bl.a));
    // Across: world x for an upright box; for one lying along z, world y.
    let side = cross(u, [0, 0, 1]);
    if (Math.hypot(...side) < 0.3) side = cross(u, [1, 0, 0]);
    side = norm(side);
    const fwd = norm(cross(side, u));
    const hw = bl.w / 2, hd = bl.d / 2;
    const corner = (end: Vec3, sx: number, fz: number): Vec3 =>
      place([end[0] + side[0] * hw * sx + fwd[0] * hd * fz, end[1] + side[1] * hw * sx + fwd[1] * hd * fz, end[2] + side[2] * hw * sx + fwd[2] * hd * fz], at, facing);
    const A = (sx: number, fz: number) => corner(bl.a, sx, fz), Bc = (sx: number, fz: number) => corner(bl.b, sx, fz);
    const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];
    const quads: [Vec3[], Vec3][] = [
      [[A(-1, 1), A(1, 1), Bc(1, 1), Bc(-1, 1)], fwd],
      [[A(1, -1), A(-1, -1), Bc(-1, -1), Bc(1, -1)], neg(fwd)],
      [[A(1, 1), A(1, -1), Bc(1, -1), Bc(1, 1)], side],
      [[A(-1, -1), A(-1, 1), Bc(-1, 1), Bc(-1, -1)], neg(side)],
      [[Bc(-1, 1), Bc(1, 1), Bc(1, -1), Bc(-1, -1)], u],
      [[A(-1, -1), A(1, -1), A(1, 1), A(-1, 1)], neg(u)],
    ];
    for (const [pts, n0] of quads) {
      const n = place(n0, [0, 0, 0], facing);
      const mid = pts.reduce<Vec3>((m, p) => [m[0] + p[0] / 4, m[1] + p[1] / 4, m[2] + p[2] / 4], [0, 0, 0]);
      if (dot(n, sub(cam.eye, mid)) <= 0) continue; // facing away
      const p = project(cam, pts, flat);
      if (!p) continue;
      // Shade from the 3D: how squarely the face meets the key light, plus sky
      // light on anything facing up. Tops are lightest, undersides darkest.
      const lambert = 0.5 + 0.5 * dot(n, KEY);
      const shade = Math.max(-1.6, Math.min(1, -1.45 + 2 * lambert + 0.55 * Math.max(0, n[1]) - 0.35 * Math.max(0, -n[1])));
      // Light falls off with height: the face's gradient runs from its highest
      // corner to its lowest, in the world. A level face (a jaw's underside) is flat.
      let hi = pts[0], lo = pts[0];
      for (const q of pts) {
        if (q[1] > hi[1]) hi = q;
        if (q[1] < lo[1]) lo = q;
      }
      const line = hi[1] - lo[1] > 0.01 ? [...flatProj(hi), ...flatProj(lo)] as [number, number, number, number] : undefined;
      faces.push({ pts: p.pts, depth: p.depth, c: bl.c, shade, line, blur: bucket(cam.blurAt(p.depth)) });
    }
  }
  // The figure is painted as one layer: its blur is its sharpest part's (the
  // face in a close-up, the phone in the insert).
  // Its sprite: 1.83m tall in px at the chest's distance, and a grid anchor at its feet.
  const feet = cam.toCam(place([0, 0, 0], at, facing));
  if (chestZ > NEAR) {
    figures.push({
      group,
      blur: faces.reduce((m, f) => Math.min(m, f.blur), BLUR_LEVELS.length - 1),
      heightPx: (1.83 * cam.fpx) / chestZ,
      anchor: feet[2] > NEAR ? cam.proj(feet) : cam.proj(cam.toCam(place([0, 1.2, 0], at, facing))),
      blink,
    });
  }
  for (const f of faces) {
    const eye = f.c === "eyes" ? ([f.pts.reduce((m, q) => m + q[0], 0) / f.pts.length, f.pts.reduce((m, q) => m + q[1], 0) / f.pts.length] as [number, number]) : undefined;
    x.items.push({ d: toPath(f.pts), region: f.c, shadeStep: f.shade, shadeLine: f.line, eye, blur: 0, depth: f.depth, group });
  }

  phone(x, at, facing, group, flat);
}

/** The phone: a slab in the hand, dark back with a lens, lit screen facing the face. */
function phone(x: Ctx, at: Vec3, facing: number, group: number, flat?: { z: number; keep: number }) {
  const { cam, pal } = x;
  const { c, w, h, tilt } = PHONE;
  const t = 0.009;
  // Axes: across (X), up the phone (V: top edge forward and up), and out of the
  // screen (N: up and back toward the face). tilt 0 = upright, screen to the body.
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const V: Vec3 = [0, ct, st], N: Vec3 = [0, st, -ct];
  const P = (u: number, v: number, n: number): Vec3 =>
    place([c[0] + u, c[1] + v * V[1] + n * N[1], c[2] + v * V[2] + n * N[2]], at, facing);
  const faces: { pts: Vec3[]; n: Vec3; kind: "screen" | "back" | "edge" }[] = [
    { pts: [P(-w / 2, -h / 2, t), P(w / 2, -h / 2, t), P(w / 2, h / 2, t), P(-w / 2, h / 2, t)], n: N, kind: "screen" },
    { pts: [P(-w / 2, -h / 2, -t), P(-w / 2, h / 2, -t), P(w / 2, h / 2, -t), P(w / 2, -h / 2, -t)], n: [0, -N[1], -N[2]], kind: "back" },
    { pts: [P(-w / 2, h / 2, -t), P(w / 2, h / 2, -t), P(w / 2, h / 2, t), P(-w / 2, h / 2, t)], n: V, kind: "edge" },
  ];
  for (const f of faces) {
    const n = place(f.n, [0, 0, 0], facing);
    const mid = f.pts.reduce<Vec3>((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    if (dot(n, sub(cam.eye, mid)) <= 0) continue;
    const p = project(cam, f.pts, flat);
    if (!p) continue;
    const blur = bucket(cam.blurAt(p.depth));
    if (f.kind === "screen") {
      x.items.push({ d: toPath(p.pts), fill: pal.accent, blur, depth: p.depth - 0.001, group });
      x.items.push({ d: toPath(p.pts.map(([px, py], i, all) => {
        // A lighter inner panel, a pixel in from the edge.
        const cx = all.reduce((s2, q) => s2 + q[0], 0) / all.length, cy = all.reduce((s2, q) => s2 + q[1], 0) / all.length;
        return [cx + (px - cx) * 0.7, cy + (py - cy) * 0.78] as [number, number];
      })), fill: mix(pal.accent, "#ffffff", 0.55), blur, depth: p.depth - 0.002, group });
    } else if (f.kind === "back") {
      // The case: a lighter back, a dark camera bump top-left.
      x.items.push({ d: toPath(p.pts), region: "phone", blur, depth: p.depth - 0.001, group });
      const lens = project(cam, [P(-w * 0.34, h * 0.28, -t - 0.002), P(-w * 0.1, h * 0.28, -t - 0.002), P(-w * 0.1, h * 0.43, -t - 0.002), P(-w * 0.34, h * 0.43, -t - 0.002)], flat);
      if (lens) x.items.push({ d: toPath(lens.pts), region: "hair", blur, depth: p.depth - 0.003, group });
    } else {
      x.items.push({ d: toPath(p.pts), region: "phone", shadeStep: -1, blur, depth: p.depth - 0.001, group });
    }
  }
  // The screen's glow, spilling up onto the chin and hand.
  const g = cam.toCam(place([c[0], c[1] + 0.05, c[2] - 0.03], at, facing));
  if (g[2] > NEAR + 0.05) {
    const [gx, gy] = cam.proj(g);
    const r = (0.2 * cam.fpx) / g[2];
    x.items.push({ d: circlePath(gx, gy, r), grad: { id: "accent", x: gx, y: gy, rx: r, ry: r }, opacity: pal.night ? 0.5 : 0.25, blend: "screen", blur: 0, depth: g[2] - 0.05 });
  }
}

/* ---------- the frame ---------- */

export type Frame = {
  sky: string;
  /** Screen y (of 900) where the horizon sits; can be off-screen. */
  horizon: number;
  back: Shape[];
  items: Shape[];
  /** Each figure, painted as one sprite layer: its blur, height (px of 1600) and grid anchor. */
  figures: { group: number; blur: number; heightPx: number; anchor: [number, number]; blink: boolean }[];
};

export function drawFrame(r: Rig, fStop: number, look: Look, blink = false): Frame {
  const cam = camera(r, fStop);
  const pal = palette(look);
  const s = getScene(look.place);
  const x: Ctx = { cam, pal, back: [], items: [] };

  if (s.sun) sun(x, s.sun);
  // Clouds: white by day; at night a moonlit mid-tone with a lit edge.
  for (const c of s.clouds) {
    if (pal.night) paper(x, c, pal.layer(0.8), pal.edgeOpacity * 0.7, false, 0.62);
    else paper(x, c, "#ffffff", 0, false);
  }
  ground(x, s);
  s.flats.forEach((f) => flat(x, f));
  for (const piece of s.pieces) {
    const fill = pal.night && piece.night ? pal.pin(piece.night) : pal.tone(piece.shade);
    paper(x, piece.pts, fill, piece.edge ? pal.edgeOpacity * 0.8 : 0, piece.shadow ?? true, undefined, undefined, piece.material);
  }
  for (const b of s.boxes) box(x, b);
  for (const shaft of s.shafts) {
    if (!isOn(shaft.on, pal)) continue;
    const p = project(cam, shaft.pts);
    if (p) x.items.push({ d: toPath(p.pts), fill: shaft.warm ? pal.warm : "#ffffff", opacity: shaft.warm ? 0.13 : 0.1, blend: "screen", blur: soften(bucket(cam.blurAt(p.depth)), 4), depth: p.depth });
  }
  for (const w of s.wires) wire(x, w);
  if (s.wet) reflections(x, s);
  for (const l of s.lights) {
    if (!isOn(l.on, pal)) continue;
    const color = l.accent ? pal.accent : pal.night ? (l.ember ? EMBER : l.warm ? pal.warm : PAPER) : "#ffffff";
    light(cam, l.p, l.size, color, halo(color, pal), x.items, l.glow, l.dim ? 0.06 : 0.3, pal.night && !l.dim);
  }

  const figures: Frame["figures"] = [];
  figure(x, [0, 0, 0], 0, blink, 0, figures);
  if (r.partner) figure(x, r.partner.position, r.partner.facing, blink, 1, figures);

  x.back.sort((a, b) => b.depth - a.depth);
  x.items.sort((a, b) => b.depth - a.depth);
  // The horizon: straight ahead at the camera's own height, a long way off.
  const dir = sub(r.target, r.position);
  const flatLen = Math.hypot(dir[0], dir[2]);
  const far = cam.toCam(flatLen > 1e-6 ? [r.position[0] + (dir[0] / flatLen) * 1e5, r.position[1], r.position[2] + (dir[2] / flatLen) * 1e5] : [r.position[0], r.position[1], r.position[2] - 1e5]);
  const horizon = far[2] > 0 ? cam.proj(far)[1] : -1e4;
  return { sky: pal.sky, horizon, back: x.back, items: x.items, figures };
}
