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
export const BLUR_LEVELS = [0, 0.7, 1.4, 2.2, 3.2, 4.5, 6.5, 9, 12, 16, 22, 30];

export const INK = "#0a0a0a";
export const PAPER = "#f0f0f0";

export type Shape = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** Light adds up; paper doesn't. */
  blend?: "screen";
  /** Index into BLUR_LEVELS. */
  blur: number;
  /** Camera-space depth, for sorting. */
  depth: number;
};

/* ---------- palette ---------- */

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

const GREEN = "#57ff52";
/**
 * Pinned colours were designed as neutral grey + some 4i green. Split one back
 * into those two and swap the green for another accent. Green returns it as is.
 */
function retint(hex: string, accent: string): string {
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
  fig: { coat: string; sleeve: string; trousers: string; shoes: string; skin: string; hair: string; line: string; rim: string | null };
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
      fig: { coat: "#ecede8", sleeve: "#d4d5d0", trousers: "#34373a", shoes: "#111211", skin: "#f6f6f3", hair: "#141414", line: INK, rim: a },
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
    fig: { coat: "#1f2121", sleeve: "#2e3131", trousers: "#5d6061", shoes: INK, skin: "#f3f3f0", hair: INK, line: INK, rim: "#ffffff" },
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

function project(cam: Cam, world: Vec3[]): { pts: [number, number][]; depth: number } | null {
  const c = clipNear(world.map(cam.toCam));
  if (c.length < 3) return null;
  const pts = c.map(cam.proj);
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

const toPath = (pts: [number, number][], dx = 0, dy = 0) =>
  "M" + pts.map(([x, y]) => `${n1(x + dx)} ${n1(y + dy)}`).join("L") + "Z";

function circlePath(x: number, y: number, r: number): string {
  return `M${n1(x - r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x + r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x - r)} ${n1(y)}Z`;
}

/** A tapered capsule seen from anywhere: two circles and their outer tangents. */
function pillPath(ax: number, ay: number, ra: number, bx: number, by: number, rb: number): string {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy);
  if (L <= Math.abs(ra - rb) + 0.5) return circlePath(ax, ay, Math.max(ra, rb));
  const ux = dx / L, uy = dy / L;
  const k = (ra - rb) / L, m = Math.sqrt(Math.max(0, 1 - k * k));
  // Unit normals to the two tangent lines.
  const n1x = ux * k - uy * m, n1y = uy * k + ux * m;
  const n2x = ux * k + uy * m, n2y = uy * k - ux * m;
  return (
    `M${n1(ax + n1x * ra)} ${n1(ay + n1y * ra)}` +
    `L${n1(bx + n1x * rb)} ${n1(by + n1y * rb)}` +
    `A${n1(rb)} ${n1(rb)} 0 ${ra < rb ? 1 : 0} 0 ${n1(bx + n2x * rb)} ${n1(by + n2y * rb)}` +
    `L${n1(ax + n2x * ra)} ${n1(ay + n2y * ra)}` +
    `A${n1(ra)} ${n1(ra)} 0 ${ra < rb ? 0 : 1} 0 ${n1(ax + n1x * ra)} ${n1(ay + n1y * ra)}Z`
  );
}

const onScreen = (x: number, y: number, r: number) => x + r > -50 && x - r < W + 50 && y + r > -50 && y - r < H + 50;

/* ---------- light ---------- */

/**
 * A point of light: a small sharp dot in focus, a bokeh disc the size of the
 * real blur circle out of focus. The disc keeps (most of) the light's
 * energy, so a small far light spreads into a fainter disc.
 */
function light(cam: Cam, p: Vec3, sizeM: number, color: string, haloFill: string, out: Shape[], glow: number, floor = 0.3) {
  const c = cam.toCam(p);
  if (c[2] < NEAR + 0.05) return;
  const [x, y] = cam.proj(c);
  const rp = Math.max((sizeM * cam.fpx) / c[2], 0.9);
  const re = Math.max(rp, cam.blurAt(c[2]) / 2);
  if (!onScreen(x, y, re * 2.6)) return;
  const energy = Math.min(1, Math.max(floor, (rp / re) ** 2 * 1.6));
  if (glow) out.push({ d: circlePath(x, y, re * 2.6), fill: haloFill, opacity: glow * (0.5 + energy / 2), blend: "screen", blur: 0, depth: c[2] + 2e-3 });
  out.push({ d: circlePath(x, y, re), fill: color, opacity: energy, blend: "screen", blur: re > rp * 1.4 ? 1 : 0, depth: c[2] });
}

/* ---------- drawing the scene ---------- */

type Ctx = { cam: Cam; pal: Palette; back: Shape[]; items: Shape[] };

const halo = (color: string, pal: Palette) => (color === pal.accent ? "url(#svHaloAccent)" : "url(#svHaloPaper)");

/** A cut-paper polygon: soft shadow, lit top edge, then the paper. */
function paper(x: Ctx, world: Vec3[], fill: string, edge: number, shadow = true) {
  const p = project(x.cam, world);
  if (!p) return;
  const [ux, uy] = x.cam.up;
  const blur = bucket(x.cam.blurAt(p.depth));
  if (shadow) x.items.push({ d: toPath(p.pts, -ux * 7, -uy * 7), fill: "#000", opacity: x.pal.shadowOpacity, blur: soften(blur, 5), depth: p.depth + 0.3 });
  if (edge) x.items.push({ d: toPath(p.pts, ux * 2.2, uy * 2.2), fill: x.pal.edge, opacity: edge, blur, depth: p.depth + 0.2 });
  x.items.push({ d: toPath(p.pts), fill, blur, depth: p.depth });
}

function sun(x: Ctx, s: NonNullable<Scene["sun"]>) {
  const { cam, pal } = x;
  const c = cam.toCam(s.c);
  if (c[2] < 1) return;
  const [sx, sy] = cam.proj(c);
  const k = cam.fpx / c[2];
  const blur = bucket(cam.blurAt(c[2]));
  const rings = pal.night && s.nightRings ? s.nightRings.map(pal.pin) : pal.rings;
  // At night the rings sit among the flats, as in the approved city, and are dark
  // enough to lie over the road. By day they'd show on it, so they go behind the ground.
  const [list, base] = pal.night ? [x.items, c[2] + 10] : [x.back, 3e6];
  [5.2, 3.7, 2.6, 1.85, 1.35, 1].forEach((m, i) => {
    const r = s.r * m * k;
    if (!onScreen(sx, sy, r)) return;
    // Each ring is a paper disc with a soft shadow on the ring behind.
    // Cut as a 64-sided disc, like scissors round a template.
    const disc: [number, number][] = Array.from({ length: 64 }, (_, j) => [sx + Math.cos((j / 64) * Math.PI * 2) * r, sy + Math.sin((j / 64) * Math.PI * 2) * r]);
    if (i > 0) list.push({ d: toPath(disc, 0, 3), fill: "#000", opacity: pal.night ? 0.35 : 0.08, blur: soften(blur, 4), depth: base - i });
    list.push({ d: toPath(disc), fill: rings[i], blur, depth: base - i - 0.5 });
  });
  // The sun lights the air around it.
  list.push({ d: circlePath(sx, sy, s.r * 3 * k), fill: "url(#svHaloAccent)", opacity: pal.night ? 0.4 : 0.3, blend: "screen", blur: 0, depth: pal.night ? c[2] - 1 : 2e6 });
}

function flat(x: Ctx, f: Flat) {
  const { cam, pal } = x;
  const tone = pal.night && f.night ? pal.pin(f.night) : pal.layer(f.t);
  const edge = pal.night && f.edge !== undefined ? f.edge : pal.edgeOpacity + 0.15 * f.t;
  for (const poly of f.polys) paper(x, poly, tone, edge);
  // Windows. Night: lit, some in the accent. Day: cut a shade darker into the
  // paper, a few catching the sun. Factory panes: bright by day, dark at night.
  type Kind = "light" | "cut";
  const sharp = new Map<string, string>();
  for (const w of f.windows) {
    let color: string, kind: Kind;
    if (w.pane) [color, kind] = pal.night ? [pal.pane, "cut"] : ["#ffffff", "light"];
    else if (pal.night) [color, kind] = [(w.accent ?? w.r < 0.2) ? pal.accent : PAPER, "light"];
    else [color, kind] = w.r < 0.12 ? ["#ffffff", "light"] : [INK, "cut"];
    const c = cam.toCam(w.p);
    if (c[2] < NEAR) continue;
    const [px, py] = cam.proj(c);
    const k = cam.fpx / c[2];
    const bw = (w.w * k) / 2, bh = (w.h * k) / 2;
    if (!onScreen(px, py, Math.max(bw, bh) * 3)) continue;
    const blurPx = cam.blurAt(c[2]);
    if (w.pane || kind === "cut" || (blurPx < Math.min(bw, bh) * 2 && bw > 0.6)) {
      const key = `${kind}|${color}|${bucket(blurPx)}`;
      sharp.set(key, (sharp.get(key) ?? "") + `M${n1(px - bw)} ${n1(py - bh)}h${n1(bw * 2)}v${n1(bh * 2)}h${n1(-bw * 2)}Z`);
    } else {
      light(cam, w.p, Math.min(w.w, w.h) / 2, color, halo(color, pal), x.items, 0);
    }
  }
  const d0 = cam.toCam(f.polys[0][0])[2] - 0.01;
  for (const [key, d] of sharp) {
    const [kind, color, b] = key.split("|");
    x.items.push(kind === "cut"
      ? { d, fill: color, opacity: color === INK ? 0.14 : 1, blur: +b, depth: d0 }
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
      x.back.push({ d: toPath(p.pts), fill: pal.night && g.night ? pal.pin(g.night) : pal.tone(g.shade), opacity: g.opacity, blur, depth: 1e6 - i });
    }
  });
  for (const [key, d] of marks) {
    const [kind, op, b] = key.split("|");
    x.back.push({ d, fill: kind === "accent" ? pal.accent : pal.night ? PAPER : "#ffffff", opacity: +op * (pal.night ? 1 : 0.9), blur: +b, depth: 1e5 });
  }
  for (const pool of s.pools) {
    if (!isOn(pool.on, pal)) continue;
    const ring: Vec3[] = Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return [pool.c[0] + Math.cos(a) * pool.r, 0.003, pool.c[2] + Math.sin(a) * pool.r];
    });
    const p = project(cam, ring);
    if (p) x.back.push({ d: toPath(p.pts), fill: "url(#svPool)", opacity: 0.55, blend: "screen", blur: soften(bucket(cam.blurAt(p.depth)), 2), depth: 1e4 });
  }
}

/* ---------- the figure: a flat illustrated person ---------- */

type Region = "hair" | "skin" | "coat" | "sleeve" | "trousers" | "shoes" | "scarf";
type Part = { a: Vec3; b: Vec3; ra: number; rb: number; c: Region; bias?: number };

function figureParts(): Part[] {
  const cap = (a: Vec3, b: Vec3, ra: number, rb: number, c: Region, bias = 0): Part => ({ a, b, ra, rb, c, bias });
  const parts: Part[] = [
    cap([0, 1.74, -0.03], [0, 1.675, -0.045], 0.1, 0.1, "hair"), // short hair, behind the face
    cap([0, 1.645, 0.01], [0, 1.695, 0.01], 0.09, 0.088, "skin"), // head, no face
    cap([0, 1.47, 0], [0, 1.56, 0], 0.042, 0.042, "skin"), // neck
    cap([0, 1.3, 0], [0, 0.86, 0], 0.15, 0.22, "coat"), // A-line coat
    cap([-0.15, 1.39, 0], [0.15, 1.39, 0], 0.08, 0.08, "coat"), // square shoulders
    cap([-0.05, 1.47, 0.02], [0.05, 1.47, 0.02], 0.036, 0.036, "scarf", 0.03), // a small accent scarf
    cap([0.045, 1.45, 0.06], [0.07, 1.33, 0.08], 0.024, 0.02, "scarf", 0.05), // the tail
  ];
  for (const x of [1, -1]) {
    parts.push(
      cap([0.21 * x, 1.39, 0], [0.265 * x, 0.92, 0.015], 0.062, 0.048, "sleeve", 0.02),
      cap([0.27 * x, 0.87, 0.02], [0.27 * x, 0.76, 0.02], 0.038, 0.034, "skin", 0.02), // hand (the insert)
      cap([0.262 * x, 0.84, 0.06], [0.25 * x, 0.79, 0.075], 0.016, 0.014, "skin", 0.03), // thumb
      cap([0.085 * x, 0.8, 0], [0.085 * x, 0.1, 0], 0.07, 0.046, "trousers", -0.02),
      cap([0.085 * x, 0.045, -0.03], [0.09 * x, 0.04, 0.15], 0.045, 0.042, "shoes"),
    );
  }
  return parts;
}
const FIGURE = figureParts();

function figure(x: Ctx, at: Vec3, facing: number) {
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

  // Which way the figure faces relative to the camera: pieces with a bias sit
  // in front from the front and behind from the back.
  const front = Math.sign(dot(sub(cam.eye, at), [Math.sin(facing), 0, Math.cos(facing)])) || 1;
  const [ux, uy] = cam.up;
  const pieces: { ax: number; ay: number; ra: number; bx: number; by: number; rb: number; blur: number; depth: number; c: Region }[] = [];
  let far = 0;
  for (const part of FIGURE) {
    const a = cam.toCam(place(part.a, at, facing));
    const b = cam.toCam(place(part.b, at, facing));
    if (a[2] < NEAR + part.ra || b[2] < NEAR + part.rb) continue; // camera is inside it
    const [ax, ay] = cam.proj(a), [bx, by] = cam.proj(b);
    const ra = (part.ra * cam.fpx) / a[2], rb = (part.rb * cam.fpx) / b[2];
    if (!onScreen((ax + bx) / 2, (ay + by) / 2, Math.hypot(ax - bx, ay - by) + Math.max(ra, rb))) continue;
    const depth = (a[2] + b[2]) / 2 - (part.bias ?? 0) * front;
    far = Math.max(far, depth);
    pieces.push({ ax, ay, ra, bx, by, rb, blur: bucket(cam.blurAt(depth)), depth, c: part.c });
  }
  const size = pieces.reduce((m, p) => Math.max(m, p.ra, p.rb), 0);
  const line = Math.max(1.2, size * 0.035);
  // The rim (backlight, pushed up toward the sun), then one cut-paper outline,
  // both behind the whole figure so they only show round the outside.
  for (const p of pieces) {
    if (pal.fig.rim) {
      const o = line * 1.6;
      x.items.push({ d: pillPath(p.ax + ux * o, p.ay + uy * o, p.ra + line, p.bx + ux * o, p.by + uy * o, p.rb + line), fill: pal.fig.rim, opacity: pal.night ? 0.95 : 0.8, blur: p.blur, depth: far + 0.03 });
    }
    x.items.push({ d: pillPath(p.ax, p.ay, p.ra + line, p.bx, p.by, p.rb + line), fill: pal.fig.line, blur: p.blur, depth: far + 0.02 });
  }
  for (const p of pieces) {
    const fill = p.c === "scarf" ? pal.accent : pal.fig[p.c];
    x.items.push({ d: pillPath(p.ax, p.ay, p.ra, p.bx, p.by, p.rb), fill, blur: p.blur, depth: p.depth });
  }
}

/* ---------- the frame ---------- */

export function drawFrame(r: Rig, fStop: number, look: Look): { sky: string; back: Shape[]; items: Shape[] } {
  const cam = camera(r, fStop);
  const pal = palette(look);
  const s = getScene(look.place);
  const x: Ctx = { cam, pal, back: [], items: [] };

  if (s.sun) sun(x, s.sun);
  ground(x, s);
  s.flats.forEach((f) => flat(x, f));
  for (const piece of s.pieces) {
    const fill = pal.night && piece.night ? pal.pin(piece.night) : pal.tone(piece.shade);
    paper(x, piece.pts, fill, piece.edge ? pal.edgeOpacity * 0.8 : 0, piece.shadow ?? true);
  }
  for (const b of s.boxes) box(x, b);
  for (const shaft of s.shafts) {
    if (!isOn(shaft.on, pal)) continue;
    const p = project(cam, shaft.pts);
    if (p) x.items.push({ d: toPath(p.pts), fill: "#ffffff", opacity: 0.1, blend: "screen", blur: soften(bucket(cam.blurAt(p.depth)), 5), depth: p.depth });
  }
  for (const l of s.lights) {
    if (!isOn(l.on, pal)) continue;
    const color = l.accent ? pal.accent : pal.night ? PAPER : "#ffffff";
    light(cam, l.p, l.size, color, halo(color, pal), x.items, l.glow, l.dim ? 0.06 : 0.3);
  }

  figure(x, [0, 0, 0], 0);
  if (r.partner) figure(x, r.partner.position, r.partner.facing);

  x.back.sort((a, b) => b.depth - a.depth);
  x.items.sort((a, b) => b.depth - a.depth);
  return { sky: pal.sky, back: x.back, items: x.items };
}
