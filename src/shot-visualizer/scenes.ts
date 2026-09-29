/* ============================================================
   The locations: city, desert, warehouse, forest.

   Each is a paper diorama described in metres (subject at the origin,
   facing +z, camera out on +z): cut-paper flats far to near, the ground,
   props, and the lights. Nothing here has a colour. Colours come from
   the palette in render2d.ts, worked out from day/night and the accent,
   so every location stays inside the 4i palette with any accent.

   `shade` is 0 (darkest) → 1 (lightest) within the palette.
   Lights say when they're on: day, night or always.
   ============================================================ */

import type { Vec3 } from "./shots";

export type PlaceKey = "city" | "desert" | "warehouse" | "forest";
export type TimeKey = "day" | "night";

export const PLACES: Record<PlaceKey, { name: string }> = {
  city: { name: "City" },
  desert: { name: "Desert" },
  warehouse: { name: "Warehouse" },
  forest: { name: "Forest" },
};
export const PLACE_ORDER: PlaceKey[] = ["city", "desert", "warehouse", "forest"];

/** 4i green first; the rest are the site's own status colours, plus paper. */
export const ACCENTS: { name: string; hex: string }[] = [
  { name: "Green", hex: "#57ff52" },
  { name: "Gold", hex: "#ffd152" },
  { name: "Sky", hex: "#52d0ff" },
  { name: "Violet", hex: "#b08cff" },
  { name: "Paper", hex: "#f0f0f0" },
];

export type Look = { place: PlaceKey; time: TimeKey; accent: string };
export const DEFAULT_LOOK: Look = { place: "city", time: "night", accent: ACCENTS[0].hex };

export type When = "day" | "night" | "always";

/** A window or pane. `r` decides if it's lit (night) or catches the sun (day). */
export type Win = { p: Vec3; w: number; h: number; r: number; pane?: boolean; accent?: boolean; unlit?: boolean };
/** One cut-paper flat. `t` is 0 (near) → 1 (far), for haze. */
export type Flat = {
  t: number; polys: Vec3[][]; windows: Win[]; lit: number; neon: [Vec3, Vec3][];
  /** Pinned night colour and edge (the approved city); otherwise from the palette. */
  night?: string; edge?: number;
  /** Shadow sides of buildings (a step darker) and rooftop clutter (same tone). */
  shade?: Vec3[][]; details?: Vec3[][];
  /** The layer's top height (m), for its fog band. */
  top?: number;
  /** Its depth (m). */
  z: () => number;
  /** The buildings (skylines only): side, extent and height, for facade colours by day. */
  blocks?: { side: number; x0: number; x1: number; bh: number }[];
};
/** A cut-paper prop: any flat polygon. `edge` gets the backlit rim. */
/** `material`: its own colours (bark) rather than the location ramp. */
export type Piece = { pts: Vec3[]; shade: number; edge?: boolean; shadow?: boolean; night?: string; material?: string };
/** `warm`: a warm practical (lamps, bulbs) instead of paper white. */
export type Light = { p: Vec3; size: number; accent: boolean; on: When; glow: number; dim?: boolean; warm?: boolean; ember?: boolean };
export type Pool = { c: Vec3; r: number; on: When };
export type Shaft = { pts: Vec3[]; on: When; warm?: boolean };
/** `night`: pinned front, side and top colours. */
export type Box = { c: Vec3; size: Vec3; rotY?: number; shade: number; night?: [string, string, string] };
/** Ground, walls, ceiling. With `n`, drawn only from the side it faces. */
/** `dither`: 0–1 of the next lighter shade mixed in, so the pixel dither makes a dot texture. */
export type Surface = { pts: Vec3[]; shade: number; mark?: "paper" | "accent" | "paint"; opacity?: number; n?: Vec3; night?: string; dither?: number; material?: string };

export type Plan = {
  lines: [number, number, number, number][];
  dots: [number, number, number][];
  boxes: Box[];
};

export type Scene = {
  /** `nightRings`: pinned night colours, outermost first, disc last. */
  sun: { c: Vec3; r: number; nightRings?: string[] } | null;
  ground: Surface[];
  flats: Flat[];
  /** Cut-paper clouds, far off in the sky. */
  clouds: Vec3[][];
  pieces: Piece[];
  boxes: Box[];
  lights: Light[];
  pools: Pool[];
  shafts: Shaft[];
  /** Overhead wires (sagging), with a few birds sitting on them. */
  wires: { from: Vec3; to: Vec3; sag: number; birds?: number }[];
  /** A wet or polished floor: lights reflect in it. */
  wet?: boolean;
  plan: Plan;
};

/* ---------- helpers ---------- */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A frontal rectangle at depth z. */
const rect = (x0: number, y0: number, x1: number, y1: number, z: number): Vec3[] =>
  [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
/** A rectangle lying on a horizontal plane at height y. */
const flatQuad = (x0: number, x1: number, z0: number, z1: number, y: number): Vec3[] =>
  [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]];

/** A silhouette from a height function, sampled along x, standing at depth z. */
function ridge(z: number, x0: number, x1: number, step: number, h: (x: number) => number): Vec3[] {
  const pts: Vec3[] = [[x0, -0.5, z]];
  for (let x = x0; x <= x1 + 1e-9; x += step) pts.push([x, Math.max(0, h(x)), z]);
  pts.push([x1, -0.5, z]);
  return pts;
}
/** The same, with a gap in the middle for the road or path. */
function ridgeWithGap(z: number, span: number, gap: number, step: number, h: (x: number) => number): Vec3[][] {
  if (gap <= 0) return [ridge(z, -span, span, step, h)];
  return [ridge(z, -span, -gap, step, h), ridge(z, gap, span, step, h)];
}

/**
 * A bank of pixel clouds at z: flat bottoms, lumpy tops. `n` clouds spread
 * across `span`, at heights between y0 and y1 (metres, so they sit in the sky).
 */
function cloudBank(seed: number, z: number, span: number, y0: number, y1: number, n: number): Vec3[][] {
  const rand = rng(seed);
  return Array.from({ length: n }, () => {
    const cx = (rand() - 0.5) * span * 2, cy = y0 + rand() * (y1 - y0);
    const w = span * (0.08 + rand() * 0.14), h = w * (0.12 + rand() * 0.1);
    const lumps = 3 + Math.floor(rand() * 3);
    const pts: Vec3[] = [[cx - w / 2, cy, z]];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      // Lumps: the tallest in the middle, falling off to the ends.
      const bump = Math.abs(Math.sin(u * Math.PI * lumps)) * 0.45 + 0.55;
      pts.push([cx - w / 2 + u * w, cy + h * Math.sin(u * Math.PI) * bump, z]);
    }
    pts.push([cx + w / 2, cy, z]);
    return pts;
  });
}

/** A straight line of string lights between two points, sagging. */
function strand(from: Vec3, to: Vec3, sag: number, n: number, on: When, every = 4, offset = 0): Light[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return {
      p: [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t - sag * 4 * t * (1 - t),
        from[2] + (to[2] - from[2]) * t,
      ] as Vec3,
      size: 0.07,
      accent: (i + offset) % every === 0,
      warm: true,
      on,
      glow: 0.3,
    };
  });
}

function starField(seed: number): Light[] {
  const rand = rng(seed);
  return Array.from({ length: 70 }, () => ({
    p: [(rand() - 0.5) * 1400, 40 + rand() * 420, -560] as Vec3,
    size: 0.5 + rand() * 0.9,
    accent: rand() < 0.1,
    on: "night" as When,
    glow: 0,
    dim: true,
  }));
}

/* ---------- city ---------- */

function skyline(seed: number, z: number, t: number, span: number, gap: number, hMin: number, hMax: number, lit: number, night?: string, edge?: number): Flat {
  const rand = rng(seed);
  const polys: Vec3[][] = [];
  const windows: Win[] = [];
  const neon: [Vec3, Vec3][] = [];
  const scale = hMax / 20;
  const blocks: { side: number; x0: number; x1: number; bh: number }[] = [];
  for (const side of [-1, 1]) {
    const top: [number, number][] = [];
    let x = gap;
    while (x < span) {
      const bw = (4 + rand() * 9) * scale;
      const bh = hMin + rand() * (hMax - hMin) * (0.4 + 0.6 * Math.min(1, x / (gap + 12 * scale)));
      const x0 = x, x1 = x + bw;
      top.push([x0, bh]);
      // Setback: a narrower block on top, sometimes with an antenna.
      if (rand() < 0.45 && bw > 5 * scale) {
        const inset = bw * (0.18 + rand() * 0.15);
        const sh = bh + (1.5 + rand() * 4) * scale;
        top.push([x0 + inset, bh], [x0 + inset, sh]);
        if (rand() < 0.4) {
          const ax = x0 + bw / 2, ah = sh + (2 + rand() * 5) * scale;
          top.push([ax - 0.12 * scale, sh], [ax - 0.12 * scale, ah], [ax + 0.12 * scale, ah], [ax + 0.12 * scale, sh]);
        }
        top.push([x1 - inset, sh], [x1 - inset, bh]);
      }
      top.push([x1, bh]);
      blocks.push({ side, x0, x1, bh });
      // Windows: a grid of floors. Which ones are lit is decided per frame.
      const cols = Math.max(1, Math.floor((bw - 0.8) / 1.6));
      for (let fy = 2.2; fy < bh - 1.5; fy += 3.2) {
        for (let ci = 0; ci < cols; ci++) {
          const r = rand();
          if (r > lit) {
            // Unlit: no extra random draw, so the lit pattern stays exactly as designed.
            windows.push({ p: [side * (x0 + (bw / cols) * (ci + 0.5)), fy, z + 0.02], w: 0.55, h: 0.8, r: 1, unlit: true });
            continue;
          }
          windows.push({ p: [side * (x0 + (bw / cols) * (ci + 0.5)), fy, z + 0.02], w: 0.55, h: 0.8, r: r / lit, accent: rand() < 0.22 });
        }
      }
      if (lit > 0 && rand() < 0.12 && bh > 8) {
        const ny = 3 + rand() * (bh - 6);
        neon.push([[side * (x0 + 1), ny, z + 0.05], [side * (x0 + Math.min(bw - 1, 4)), ny, z + 0.05]]);
      }
      x += bw;
    }
    const pts: Vec3[] = [[side * gap, -0.5, z], ...top.map(([tx, ty]): Vec3 => [side * tx, ty, z]), [side * top[top.length - 1][0], -0.5, z]];
    polys.push(side < 0 ? pts.reverse() : pts);
  }
  // Detail pass on its own random stream, so the skyline itself never changes:
  // each building's outer side a step darker; on the near flats, rooftop
  // railings and the odd water tank.
  const drand = rng(seed + 1000);
  const shade: Vec3[][] = [];
  const details: Vec3[][] = [];
  for (const b of blocks) {
    const w = b.x1 - b.x0;
    const sx0 = b.x1 - w * (0.22 + drand() * 0.12);
    shade.push([[b.side * sx0, -0.5, z + 0.01], [b.side * b.x1, -0.5, z + 0.01], [b.side * b.x1, b.bh, z + 0.01], [b.side * sx0, b.bh, z + 0.01]]);
    if (t > 0.3) continue;
    const roll = drand();
    if (roll < 0.35) {
      // A railing: a top rail and posts every 0.9m.
      details.push([[b.side * b.x0, b.bh + 0.95, z], [b.side * b.x1, b.bh + 0.95, z], [b.side * b.x1, b.bh + 1.05, z], [b.side * b.x0, b.bh + 1.05, z]]);
      for (let px = b.x0 + 0.2; px < b.x1 - 0.1; px += 0.9) {
        details.push([[b.side * px, b.bh, z], [b.side * (px + 0.1), b.bh, z], [b.side * (px + 0.1), b.bh + 1, z], [b.side * px, b.bh + 1, z]]);
      }
    } else if (roll < 0.55 && w > 3) {
      // A water tank on legs.
      const cx = b.x0 + w * (0.3 + drand() * 0.4);
      details.push([[b.side * (cx - 0.8), b.bh + 1.2, z], [b.side * (cx + 0.8), b.bh + 1.2, z], [b.side * (cx + 0.8), b.bh + 3, z], [b.side * (cx - 0.8), b.bh + 3, z]]);
      details.push([[b.side * (cx - 0.9), b.bh + 3, z], [b.side * cx, b.bh + 3.5, z], [b.side * (cx + 0.9), b.bh + 3, z]]);
      for (const lx of [cx - 0.65, cx + 0.55]) details.push([[b.side * lx, b.bh, z], [b.side * (lx + 0.1), b.bh, z], [b.side * (lx + 0.1), b.bh + 1.25, z], [b.side * lx, b.bh + 1.25, z]]);
    } else if (roll < 0.7) {
      // An AC unit or two.
      const cx = b.x0 + w * (0.2 + drand() * 0.5);
      details.push([[b.side * cx, b.bh, z], [b.side * (cx + 1.1), b.bh, z], [b.side * (cx + 1.1), b.bh + 0.8, z], [b.side * cx, b.bh + 0.8, z]]);
    }
  }
  return { t, polys, windows, lit: 1, neon, night, edge, shade, details, top: hMax, z: () => z, blocks };
}

/* The city at night is the approved design (29 Sep): its colours, edges and
   layout are pinned. Other accents re-tint those colours; day uses the palette. */
function city(): Scene {
  const ROAD = 2.6;
  const ground: Surface[] = [
    { pts: flatQuad(-300, 300, -150, 300, 0), shade: 0.05, n: [0, 1, 0], night: "#0b0d0b" },
    { pts: flatQuad(-ROAD, ROAD, -150, 300, 0.002), shade: 0.12, night: "#101310", dither: 0.22 },
    { pts: flatQuad(-ROAD - 0.18, -ROAD, -150, 300, 0.004), shade: 0.32, night: "#1f241f" },
    { pts: flatQuad(ROAD, ROAD + 0.18, -150, 300, 0.004), shade: 0.32, night: "#1f241f" },
  ];
  // Centre-line dashes (the depth markings, every 3m) and a crossing behind the subject.
  for (let z = -60; z < 30; z += 3) {
    if (z > -5 && z < -1) continue;
    ground.push({ pts: flatQuad(-0.07, 0.07, z, z + 1.4, 0.005), shade: 1, mark: "paper", opacity: 0.28 });
  }
  for (let x = -ROAD + 0.25; x < ROAD - 0.2; x += 0.6) {
    ground.push({ pts: flatQuad(x, x + 0.32, -3.6, -1.4, 0.005), shade: 1, mark: "paper", opacity: 0.28 });
  }

  const pieces: Piece[] = [];
  const lights: Light[] = [];
  const pools: Pool[] = [];
  const shafts: Shaft[] = [];
  const lamps: Vec3[] = [[-3.4, 0, 3.5], [3.4, 0, -2.5], [-3.4, 0, -7], [3.4, 0, -11.5]];
  for (const at of lamps) {
    const toward = at[0] < 0 ? 1 : -1;
    pieces.push({ pts: rect(at[0] - 0.06, 0, at[0] + 0.06, 4.2, at[2]), shade: 0, shadow: false, night: "#090a09" });
    pieces.push({ pts: rect(Math.min(at[0], at[0] + toward * 0.9), 4.1, Math.max(at[0], at[0] + toward * 0.9), 4.22, at[2]), shade: 0, shadow: false, night: "#090a09" });
    const head: Vec3 = [at[0] + toward * 0.85, 4.05, at[2]];
    lights.push({ p: head, size: 0.18, accent: false, on: "night", glow: 0.6, warm: true });
    pools.push({ c: [head[0], 0, head[2]], r: 2.6, on: "night" });
    // The cone of light under it.
    shafts.push({ pts: [[head[0] - 0.12, 4.0, head[2]], [head[0] + 0.12, 4.0, head[2]], [head[0] + 1.5, 0.01, head[2]], [head[0] - 1.5, 0.01, head[2]]], on: "night", warm: true });
  }
  lights.push(
    ...strand([-4.8, 4.4, -5], [4.8, 4.6, -5.5], 0.7, 16, "night", 4, 0),
    ...strand([-4.8, 5.2, -9.5], [4.8, 5.4, -10], 0.9, 16, "night", 4, 1),
    ...strand([-4.2, 3.2, -16], [4.2, 3.0, -16.5], 0.6, 16, "night", 4, 2),
    ...strand([-5, 2.2, -21], [5, 2.4, -21], 0.4, 16, "night", 4, 3),
    ...strand([-5, 4.2, -28], [5, 4.0, -28.5], 0.8, 16, "night", 4, 4),
  );
  const crate: [string, string, string] = ["#1c1f1c", "#141614", "#2c332b"];
  const boxes: Box[] = [
    { c: [1.6, 0.35, -1.8], size: [0.7, 0.7, 0.7], rotY: 0.2, shade: 0.3, night: crate },
    { c: [-1.5, 0.25, -5.2], size: [1, 0.5, 0.6], rotY: 0.5, shade: 0.3, night: crate },
  ];
  return {
    sun: { c: [0, 130, -600], r: 55, nightRings: ["#0d140d", "#0f1b0f", "#122512", "#163316", "#1c461b", "#57ff52"] },
    ground,
    flats: [
      skyline(11, -140, 1, 260, 0, 10, 38, 0.12, "#20401f", 0.6),
      skyline(23, -75, 0.75, 150, 4, 8, 28, 0.16, "#17291a", 0.55),
      skyline(37, -42, 0.5, 90, 5, 6, 20, 0.22, "#121b13", 0.5),
      skyline(41, -24, 0.25, 60, 5.5, 5, 15, 0.28, "#0f140f", 0.45),
      skyline(53, -13, 0, 40, 4.5, 4, 11, 0.32, "#0c0f0c", 0.4),
    ],
    clouds: cloudBank(61, -700, 900, 90, 260, 9),
    pieces,
    boxes,
    lights,
    pools,
    shafts,
    // Power lines strung across the street and along it, lamp to lamp.
    wires: [
      { from: [-6, 7.2, -6], to: [6, 7.0, -6.5], sag: 0.7, birds: 3 },
      { from: [-6, 6.6, -6.2], to: [6, 6.3, -6.6], sag: 0.8 },
      { from: [-6.5, 7.8, -15], to: [6.5, 7.4, -15.5], sag: 0.9, birds: 2 },
      { from: [-7, 8.2, -22], to: [7, 8.4, -22], sag: 1 },
      { from: [-3.4, 4.3, 3.5], to: [-3.4, 4.3, -7], sag: 0.4 },
      { from: [3.4, 4.3, -2.5], to: [3.4, 4.3, -11.5], sag: 0.35 },
    ],
    wet: true,
    plan: {
      lines: [[-ROAD, -40, -ROAD, 40], [ROAD, -40, ROAD, 40], [-40, -13, -4.5, -13], [4.5, -13, 40, -13]],
      dots: lamps.map(([x, , z]): [number, number, number] => [x, z, 0.08]),
      boxes,
    },
  };
}

/* ---------- desert ---------- */

function mesas(seed: number, z: number, t: number, span: number, hMin: number, hMax: number): Flat {
  const rand = rng(seed);
  const tops: { c: number; w: number; h: number; slope: number; step: number }[] = [];
  for (let x = -span; x < span; ) {
    const w = (hMax * 0.8) * (0.6 + rand() * 1.8);
    tops.push({ c: x + w / 2, w: w / 2, h: hMin + rand() * (hMax - hMin), slope: w * (0.45 + rand() * 0.5), step: rand() < 0.5 ? 0.35 + rand() * 0.2 : 0 });
    x += w * (1.2 + rand() * 1.6);
  }
  const base = hMin * 0.25;
  const h = (x: number) => {
    let y = base + Math.sin(x * 0.02 + seed) * base * 0.4;
    for (const m of tops) {
      const d = Math.abs(x - m.c);
      if (d < m.w) y = Math.max(y, m.h);
      else if (d < m.w + m.slope) {
        const k = 1 - (d - m.w) / m.slope;
        // A shelf partway down, the way buttes step.
        // Steep near the top, a long scree slope below, sometimes a shelf.
        const drop = k > 0.8 ? m.h - (m.h - base) * (1 - k) * 2.5 : base + (m.h - base) * 0.5 * (k / 0.8) ** 1.6;
        y = Math.max(y, m.step && k > 0.4 && k < 0.6 ? Math.max(drop, m.h * m.step) : drop);
      }
    }
    return y;
  };
  return { t, polys: [ridge(z, -span, span, span / 400, h)], windows: [], lit: 0, neon: [], top: hMax, z: () => z };
}

function dunes(seed: number, z: number, t: number, span: number, gap: number, amp: number): Flat {
  const p = seed * 1.7;
  const h = (x: number) =>
    amp * (1 + 0.55 * Math.sin(x / (amp * 3.1) + p) + 0.3 * Math.sin(x / (amp * 1.3) + p * 2) + 0.15 * Math.sin(x / (amp * 0.55) + p * 3));
  return { t, polys: ridgeWithGap(z, span, gap, Math.max(0.15, amp / 12), h), windows: [], lit: 0, neon: [], top: amp * 2.2, z: () => z };
}

/** A saguaro: a trunk and a couple of arms, as rounded paper strips. */
function saguaro(x: number, z: number, h: number, seed: number): Piece[] {
  const rand = rng(seed);
  const tw = h * 0.085;
  const round = (x0: number, y0: number, x1: number, y1: number): Vec3[] => {
    // A strip with a rounded top.
    const r = (x1 - x0) / 2, cx = (x0 + x1) / 2;
    const pts: Vec3[] = [[x0, y0, z], [x1, y0, z]];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      pts.push([cx + Math.cos(a) * r, y1 + Math.sin(a) * r, z]);
    }
    return pts;
  };
  const out: Piece[] = [{ pts: round(x - tw, -0.05, x + tw, h - tw), shade: 0.1, edge: true }];
  for (const side of [-1, 1]) {
    if (rand() < 0.25) continue;
    const ay = h * (0.35 + rand() * 0.25);
    const reach = h * (0.18 + rand() * 0.08);
    const up = h * (0.2 + rand() * 0.2);
    const ax = x + side * (tw + reach);
    out.push({ pts: rect(Math.min(x, ax), ay, Math.max(x, ax) + (side > 0 ? 0 : 0), ay + tw * 1.4, z), shade: 0.1 });
    out.push({ pts: round(ax - tw * 0.8, ay, ax + tw * 0.8, ay + up), shade: 0.1, edge: true });
  }
  return out;
}

function desert(): Scene {
  const ROAD = 2.4;
  const rand = rng(91);
  const ground: Surface[] = [
    { pts: flatQuad(-400, 400, -260, 300, 0), shade: 0.22, n: [0, 1, 0], dither: 0.35 },
    { pts: flatQuad(-ROAD, ROAD, -260, 300, 0.002), shade: 0.1, dither: 0.18 },
  ];
  // Faded centre dashes, far apart, like a back road.
  for (let z = -80; z < 30; z += 6) {
    ground.push({ pts: flatQuad(-0.07, 0.07, z, z + 2, 0.005), shade: 1, mark: "paper", opacity: 0.2 });
  }
  const pieces: Piece[] = [];
  const lights: Light[] = [];
  // Telephone poles down the left of the road, with the wire between them: a rhythm to read depth by.
  const poles: Vec3[] = [];
  for (let z = 6; z > -90; z -= 10) poles.push([-4.2, 0, z]);
  poles.forEach(([x, , z], i) => {
    pieces.push({ pts: rect(x - 0.09, 0, x + 0.09, 6.5, z), shade: 0.02, edge: true });
    pieces.push({ pts: rect(x - 0.8, 6.0, x + 0.8, 6.14, z), shade: 0.02 });
    if (i > 0) {
      const [, , pz] = poles[i - 1];
      pieces.push({ pts: [[x - 0.7, 6.1, z], [x - 0.7, 6.1, pz], [x - 0.7, 6.05, pz], [x - 0.7, 6.05, z]], shade: 0.02 });
    }
  });
  // A motel strand across the road, and one down the right side.
  lights.push(
    ...strand([-4.2, 5.4, -14], [4.5, 4.4, -14], 0.8, 18, "night"),
    ...strand([4.5, 3.6, -3], [4.5, 3.6, -26], 0.5, 22, "night", 5),
    ...starField(13),
  );
  for (let z = -3; z >= -26; z -= 5.75) pieces.push({ pts: rect(4.45, 0, 4.55, 3.7, z), shade: 0.05 });
  // Cacti and rocks either side, near and far.
  let seed = 300;
  for (const [x, z, h] of [[-3.2, -3, 2.6], [5.6, 1.5, 3.4], [-7, -11, 4.2], [8, -18, 3.6], [-12, -30, 5], [14, -42, 4.5], [-2.9, 4, 1.6]] as const) {
    pieces.push(...saguaro(x, z, h, seed++));
  }
  for (let i = 0; i < 40; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (ROAD + 0.6 + rand() * 14), z = 12 - rand() * 70, s = 0.15 + rand() * 0.45;
    const pts: Vec3[] = [[x - s, -0.02, z], [x - s * 0.7, s * 0.6, z], [x + s * 0.1, s * 0.9, z], [x + s * 0.8, s * 0.45, z], [x + s, -0.02, z]];
    pieces.push({ pts, shade: 0.16 });
  }
  return {
    sun: { c: [30, 55, -600], r: 80 },
    ground,
    flats: [
      mesas(5, -260, 1, 420, 22, 62),
      mesas(9, -130, 0.72, 230, 10, 34),
      dunes(3, -55, 0.45, 110, 0, 3.2),
      dunes(8, -26, 0.2, 70, 3.5, 1.4),
    ],
    clouds: cloudBank(71, -700, 900, 60, 200, 7),
    pieces,
    boxes: [{ c: [1.8, 0.3, -3.5], size: [0.9, 0.6, 0.6], rotY: -0.3, shade: 0.3 }],
    lights,
    pools: [],
    shafts: [],
    wires: [],
    plan: {
      lines: [[-ROAD, -40, -ROAD, 40], [ROAD, -40, ROAD, 40]],
      dots: poles.map(([x, , z]): [number, number, number] => [x, z, 0.12]),
      boxes: [{ c: [1.8, 0.3, -3.5], size: [0.9, 0.6, 0.6], rotY: -0.3, shade: 0 }],
    },
  };
}

/* ---------- warehouse ---------- */

function warehouse(): Scene {
  const X = 9.5, TOP = 12, BACK = -20;
  const ground: Surface[] = [
    { pts: flatQuad(-X, X, BACK, 60, 0), shade: 0.38, n: [0, 1, 0], dither: 0.15, night: "#141614" },
    { pts: [[-X, 0, 60], [-X, 0, BACK], [-X, TOP, BACK], [-X, TOP, 60]], shade: 0.2, n: [1, 0, 0] },
    { pts: [[X, 0, BACK], [X, 0, 60], [X, TOP, 60], [X, TOP, BACK]], shade: 0.2, n: [-1, 0, 0] },
    { pts: flatQuad(-X, X, BACK, 60, TOP), shade: 0.08, n: [0, -1, 0] },
  ];
  // Floor joints every 4m (the depth markings), then the painted safety lanes.
  for (let z = BACK + 4; z < 40; z += 4) ground.push({ pts: flatQuad(-X, X, z, z + 0.03, 0.003), shade: 0, opacity: 0.35 });
  for (let x = -8; x <= 8; x += 4) ground.push({ pts: flatQuad(x, x + 0.03, BACK, 40, 0.003), shade: 0, opacity: 0.35 });
  for (const x of [-2.3, 2.2]) ground.push({ pts: flatQuad(x, x + 0.1, BACK, 40, 0.005), shade: 1, mark: "paint", opacity: 0.85 });
  // A hatched no-parking box by the racks.
  for (let z = -9; z < -6; z += 0.5) ground.push({ pts: [[3.2, 0.005, z], [3.45, 0.005, z], [4.2, 0.005, z - 0.7], [3.95, 0.005, z - 0.7]], shade: 1, mark: "paint", opacity: 0.6 });

  // The back wall: one flat with three bays of tall factory windows.
  const windows: Win[] = [];
  for (const bx of [-6, 0, 6]) {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 6; r++) {
        windows.push({ p: [bx - 1.8 + c * 1.2 + 0.6, 3.2 + r * 1.3 + 0.6, BACK + 0.02], w: 1.05, h: 1.15, r: 0, pane: true });
      }
    }
  }
  const back: Flat = { t: 0.45, polys: [rect(-X - 1, -0.5, X + 1, TOP + 0.5, BACK)], windows, lit: 1, neon: [], top: TOP, z: () => BACK };

  const pieces: Piece[] = [];
  const lights: Light[] = [];
  const pools: Pool[] = [];
  // Portal frames: two steel columns and a beam, with a pendant lamp hung off each beam.
  for (const z of [-15.5, -10, -4.5, 1, 6.5]) {
    pieces.push({ pts: rect(-X + 0.6, 0, -X + 1.05, 10.2, z), shade: 0.06, edge: true });
    pieces.push({ pts: rect(X - 1.05, 0, X - 0.6, 10.2, z), shade: 0.06, edge: true });
    pieces.push({ pts: [[-X + 0.6, 10.2, z], [X - 0.6, 10.2, z], [X - 0.6, 10.9, z], [0, 11.6, z], [-X + 0.6, 10.9, z]], shade: 0.06 });
    for (const x of [-3.6, 3.6]) {
      pieces.push({ pts: rect(x - 0.015, 6.4, x + 0.015, 10.2, z), shade: 0.02 });
      pieces.push({ pts: [[x - 0.45, 6.0, z], [x + 0.45, 6.0, z], [x + 0.12, 6.45, z], [x - 0.12, 6.45, z]], shade: 0.04 });
      lights.push({ p: [x, 5.97, z], size: 0.2, accent: false, on: "night", glow: 0.5, warm: true });
      pools.push({ c: [x, 0, z], r: 3, on: "night" });
    }
  }
  // Pallet racks down both sides: uprights and shelves, with boxes on them.
  const boxes: Box[] = [
    { c: [1.7, 0.4, -1.8], size: [0.8, 0.8, 0.8], rotY: 0.15, shade: 0.45 },
    { c: [1.9, 1.05, -1.9], size: [0.55, 0.5, 0.55], rotY: -0.1, shade: 0.5 },
    { c: [-1.6, 0.35, -6], size: [1.2, 0.7, 0.9], rotY: 0.4, shade: 0.45 },
  ];
  const rand = rng(17);
  for (const [x0, z] of [[4.8, -8], [4.8, -13], [-8.3, -9], [-8.3, -14.5]] as const) {
    const x1 = x0 + 3.5;
    for (const x of [x0, x1]) pieces.push({ pts: rect(x, 0, x + 0.1, 5.5, z + 0.5), shade: 0.08 });
    for (const y of [0.15, 1.9, 3.7]) {
      pieces.push({ pts: rect(x0, y, x1 + 0.1, y + 0.14, z + 0.5), shade: 0.08, edge: true });
      for (let bx = x0 + 0.2; bx < x1 - 0.5; bx += 0.9 + rand() * 0.3) {
        if (rand() < 0.2) continue;
        const s = 0.55 + rand() * 0.3;
        boxes.push({ c: [bx + s / 2, y + 0.14 + s / 2, z], size: [s, s, 0.8], shade: 0.3 + rand() * 0.25 });
      }
    }
  }
  // An exit sign over the back door.
  pieces.push({ pts: rect(-7.8, 0, -6.2, 2.4, BACK + 0.03), shade: 0.1 });
  lights.push({ p: [-7, 2.8, BACK + 0.05], size: 0.25, accent: true, on: "always", glow: 0.6 });

  // Daylight shafts from the three window bays.
  const shafts: Shaft[] = [-6, 0, 6].map((bx) => ({
    pts: [[bx - 2, 10.8, BACK + 0.1], [bx + 2, 10.8, BACK + 0.1], [bx + 3.2, 0.01, BACK + 9], [bx - 0.8, 0.01, BACK + 9]] as Vec3[],
    on: "day" as When,
  }));

  return {
    sun: null,
    ground,
    flats: [back],
    clouds: [],
    pieces,
    boxes,
    lights,
    pools,
    shafts,
    wires: [],
    wet: true,
    plan: {
      lines: [[-X, BACK, X, BACK], [-X, BACK, -X, 40], [X, BACK, X, 40], [-2.3, BACK, -2.3, 40], [2.2, BACK, 2.2, 40]],
      dots: [-15.5, -10, -4.5, 1, 6.5].flatMap((z): [number, number, number][] => [[-X + 0.8, z, 0.25], [X - 0.8, z, 0.25]]),
      boxes: boxes.filter((b) => b.c[1] < 0.6),
    },
  };
}

/* ---------- forest ---------- */

function treeline(seed: number, z: number, t: number, span: number, gap: number, hMin: number, hMax: number): Flat {
  const rand = rng(seed);
  type Tree = { c: number; h: number; w: number; pine: boolean };
  const trees: Tree[] = [];
  for (let x = -span; x < span; ) {
    const h = hMin + rand() * (hMax - hMin);
    const pine = rand() < 0.62;
    const w = h * (pine ? 0.38 + rand() * 0.12 : 0.55 + rand() * 0.2);
    if (Math.abs(x) > gap + w * 0.3 || gap === 0) trees.push({ c: x, h, w, pine });
    x += w * (0.35 + rand() * 0.45);
  }
  const floor = hMin * 0.12;
  const h = (x: number) => {
    let y = floor;
    for (const tr of trees) {
      const d = Math.abs(x - tr.c);
      if (d > tr.w / 2) continue;
      if (tr.pine) {
        // Three tiers, each a triangle a little narrower than the one below.
        for (let k = 0; k < 3; k++) {
          const bottom = tr.h * (0.18 + 0.24 * k), top = bottom + tr.h * (0.46 - 0.04 * k);
          const hw = (tr.w / 2) * (1 - 0.24 * k);
          if (d < hw) y = Math.max(y, top - (top - bottom) * (d / hw));
        }
      } else {
        // A crown of three lobes: two low at the sides, one high in the middle.
        const dx = x - tr.c;
        for (const [ox, oy, rr] of [[-0.24, 0.62, 0.3], [0.26, 0.6, 0.28], [0, 0.78, 0.26]]) {
          const r = tr.w * rr, e = dx - ox * tr.w;
          if (Math.abs(e) < r) y = Math.max(y, tr.h * oy + Math.sqrt(r * r - e * e) * 0.9);
        }
      }
      if (d < tr.w * 0.05) y = Math.max(y, tr.h * 0.25);
    }
    return y;
  };
  return { t, polys: ridgeWithGap(z, span, gap, Math.max(0.08, hMin / 30), h), windows: [], lit: 0, neon: [], top: hMax, z: () => z };
}

function forest(): Scene {
  const PATH = 1.1;
  const rand = rng(44);
  const ground: Surface[] = [
    { pts: flatQuad(-300, 300, -200, 300, 0), shade: 0.1, n: [0, 1, 0] },
  ];
  // A path that wanders a little, built from short segments.
  const pathX = (z: number) => Math.sin(z * 0.09) * 0.9 * Math.min(1, Math.max(0, -z / 6));
  for (let z = -70; z < 30; z += 1.5) {
    const a = pathX(z), b = pathX(z + 1.5);
    ground.push({ pts: [[a - PATH, 0.002, z], [a + PATH, 0.002, z], [b + PATH, 0.002, z + 1.5], [b - PATH, 0.002, z + 1.5]], shade: 0.3, dither: 0.3, material: "dirt" });
  }
  const pieces: Piece[] = [];
  const lights: Light[] = [];
  const trunks: [number, number, number][] = [];
  // Trunks: near ones thick and dark, going up out of frame; some right by the camera.
  const spots: [number, number][] = [[-3.2, 4.5], [2.6, 7], [-1.9, -2.5], [2.3, -4], [-3.8, -8], [4.4, -1], [-6, 2], [6.5, -9], [-2.8, -14], [3.2, -17], [-5.5, -20], [1.8, -24], [-9, -12], [8.5, -22], [-3.5, -30], [4, -34]];
  for (const [x, z] of spots) {
    const w = 0.22 + rand() * 0.3;
    trunks.push([x, z, w / 2]);
    pieces.push({ pts: [[x - w / 2, -0.05, z], [x + w / 2, -0.05, z], [x + w * 0.4, 14, z], [x - w * 0.4, 14, z]], shade: 0.04, edge: true, material: "bark" });
    // A branch or two.
    if (rand() < 0.6) {
      const by = 3 + rand() * 4, dir = rand() < 0.5 ? -1 : 1;
      pieces.push({ pts: [[x, by, z], [x + dir * 1.6, by + 1.2, z], [x + dir * 1.6, by + 1.32, z], [x, by + 0.25, z]], shade: 0.04, material: "bark" });
    }
  }
  // Ferns along the path: small paper fans.
  for (let i = 0; i < 46; i++) {
    const z = 10 - rand() * 50, side = rand() < 0.5 ? -1 : 1;
    const x = pathX(z) + side * (PATH + 0.1 + rand() * 2.5), s = 0.25 + rand() * 0.35;
    const pts: Vec3[] = [[x - s * 0.1, 0, z]];
    for (let k = 0; k <= 6; k++) {
      const a = Math.PI * (0.1 + 0.8 * (k / 6));
      pts.push([x - Math.cos(a) * s, Math.sin(a) * s * (k % 2 ? 0.7 : 1.05), z]);
    }
    pts.push([x + s * 0.1, 0, z]);
    pieces.push({ pts, shade: 0.16 });
  }
  // Night: fireflies over the path. Day: sun through gaps in the canopy.
  for (let i = 0; i < 44; i++) {
    const z = 3 - rand() * 30;
    // Soft, glowy orange (Grace liked them warm): a warm light, not the accent.
    lights.push({ p: [pathX(z) + (rand() - 0.5) * 7, 0.4 + rand() * 2.4, z], size: 0.035, accent: false, ember: true, on: "night", glow: 0.8 });
  }
  for (let i = 0; i < 38; i++) {
    lights.push({ p: [(rand() - 0.5) * 30, 3 + rand() * 7, -6 - rand() * 26], size: 0.18 + rand() * 0.2, accent: false, on: "day", glow: 0.25 });
  }
  lights.push(...starField(29));
  const shafts: Shaft[] = [[-4, -14], [1.5, -22], [5, -9], [-1, -6]].map(([x, z]) => ({
    pts: [[x, 16, z - 8], [x + 1.2, 16, z - 8], [x + 1.9, 0.01, z], [x + 0.3, 0.01, z]] as Vec3[],
    on: "day" as When,
  }));
  return {
    sun: { c: [-40, 150, -600], r: 50 },
    ground,
    flats: [
      treeline(2, -150, 1, 260, 0, 18, 34),
      treeline(6, -80, 0.75, 150, 0, 12, 26),
      treeline(12, -45, 0.5, 90, 2.5, 10, 20),
      treeline(19, -26, 0.25, 60, 2.2, 8, 17),
    ],
    clouds: cloudBank(83, -700, 900, 110, 280, 8),
    pieces,
    boxes: [{ c: [1.4, 0.2, -3], size: [0.9, 0.4, 0.5], rotY: 0.7, shade: 0.25 }],
    lights,
    pools: [],
    shafts,
    wires: [],
    plan: {
      lines: [],
      dots: trunks,
      boxes: [{ c: [1.4, 0.2, -3], size: [0.9, 0.4, 0.5], rotY: 0.7, shade: 0 }],
    },
  };
}

/* ---------- lookup ---------- */

const BUILD: Record<PlaceKey, () => Scene> = { city, desert, warehouse, forest };
const cache = new Map<PlaceKey, Scene>();

export function scene(place: PlaceKey): Scene {
  let s = cache.get(place);
  if (!s) {
    s = BUILD[place]();
    cache.set(place, s);
  }
  return s;
}
