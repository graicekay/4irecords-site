/* ============================================================
   Pixel art: render2d's shapes painted small, then graded, reduced
   to a handful of colours and ordered-dithered.

   1. Paint every shape into a 320×180 canvas (1/5 of render2d's
      1600×900), grouped so each run of shapes with the same blur and
      blend is blurred once.
   2. Grade every colour onto the pixel palette as it's painted: neutrals
      onto a cool ramp (ink → blue-teal → off-white, lifted at night),
      colours onto an accent family. So every flat surface is exactly one
      palette colour.
   3. Quantize what painting blended (blur, glows, edges) back to the
      palette, dithering with a 4×4 Bayer matrix between the two nearest.
      Flat areas stay flat; glows, blur and haze turn into dot patterns.

   Shared verbatim by 4iProductions-site and 4irecords-site.
   ============================================================ */

import { W, BLUR_LEVELS, PAPER, WARM, EMBER, PAINT, mix, retint, type Shape, type Glow, type Frame } from "./render2d";
import type { Look, PlaceKey, TimeKey } from "./scenes";

export const PW = 320;
/** A figure is drawn as a sprite about this many pixels tall (more, up close). */

export const PH = 180;
const SCALE = PW / W;

/* ---------- colour ---------- */

const rgbOf = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/**
 * Each location's own colours (Grace, 29 Sep: "all colors should be consistent
 * with background: desert is orange/yellow/brown, forest green… accent color
 * just affects the lighting and mostly night time lighting").
 *
 * Per location and time: a 10-step `ramp` for ground, props and walls, hue-
 * shifted the pixel-art way (cool, saturated darks → warm lights); `haze`, the
 * cut-paper layers near → far, fading into the sky; the `sky` gradient, top →
 * horizon; and by day the `sun`'s rings, outer → disc. The accent never tints
 * these. It is the night's lighting: neon, lit windows, bulbs, the moon's glow,
 * fireflies, the phone screen.
 */
/** `facades`: by day, the colours the nearer buildings are painted (city). */
/**
 * `lift`: how much the near-black diorama tones are lifted into the ramp (night default 2.6).
 * `tinted`: its colours were designed as grey + 4i green; re-tint them for the accent.
 * `materials`: things with their own colour whatever the ramp (bark, dirt), as [dark, mid, light].
 */
type LocPal = {
  ramp: string[]; haze: string[]; sky: [string, string]; sun?: string[]; facades?: string[]; lift?: number;
  tinted?: boolean; materials?: Record<string, [string, string, string]>;
};

// The city at night Grace liked most: the OG paper-diorama tones (ink sky,
// near-black green layers, the far ones lit green), not lifted.
const CITY_NIGHT = ["#0a0a0a", "#0c0f0c", "#101310", "#121b13", "#17291a", "#1f3320", "#20401f", "#2f5a2c", "#5d8a58", "#f0f0f0"];

const PALETTES: Record<PlaceKey, Record<TimeKey, LocPal>> = {
  city: {
    // After ref 01: cream and ochre light, warm grey shadows, a clear sky.
    // 4i rules: no red, go easy on blue (sky blue is fine).
    day: {
      ramp: ["#1c1b1d", "#2e2c2e", "#46423f", "#625c56", "#80786f", "#9f968b", "#bdb4a6", "#d9d0c0", "#ece5d6", "#fbf6ea"],
      haze: ["#3f3b39", "#55504b", "#6d6761", "#8a847c", "#a6a39a", "#c0c1bb", "#d4d9d6"],
      sky: ["#5e9fd2", "#cfe5ee"],
      sun: ["#dcecef", "#e4f0ef", "#ecf3ee", "#f3f6ec", "#faf8ea", "#fff6dc"],
      // The third is the accent, muted with cream (sage with 4i green); see pixelPalette().
      facades: ["#eadcc0", "#d9a441", "ACCENT", "#d4a574"],
    },
    night: {
      ramp: CITY_NIGHT,
      haze: ["#0c0f0c", "#0f140f", "#121b13", "#17291a", "#1c341c", "#20401f", "#28502a"],
      sky: ["#0a0a0a", "#0d140d"],
      lift: 1,
      tinted: true,
    },
  },
  desert: {
    // Sand, ochre and warm brown: orange-yellow, never red.
    day: {
      ramp: ["#231a12", "#3b2a1b", "#573c23", "#74512c", "#936834", "#b1813f", "#c99a4f", "#dcb466", "#eccd8a", "#f8ebc9"],
      haze: ["#6f4a2a", "#8a5f33", "#a5773f", "#bd8f52", "#cca56c", "#d7ba8a", "#e0cca7"],
      sky: ["#5a9bd0", "#f2dcae"],
      sun: ["#f7e3b7", "#f9e9c3", "#fbeecd", "#fcf2d8", "#fff6e2", "#fffbec"],
    },
    // Warm umber in the dark; the moon and the lights bring the green.
    night: {
      ramp: ["#0d0b08", "#19140e", "#261e15", "#35291c", "#463625", "#584430", "#6d553d", "#86694c", "#a58563", "#e6d8c0"],
      haze: ["#1a150f", "#231c14", "#2e251a", "#3a2f21", "#473a29", "#554632", "#63523b"],
      sky: ["#060504", "#1c1710"],
      lift: 2.2,
    },
  },
  forest: {
    // Daylight through the trees: bright greens, brown bark, a tan dirt path,
    // blue sky over the treetops, far treelines fading pale.
    day: {
      ramp: ["#16240f", "#223a17", "#2f521f", "#3f6a27", "#548232", "#6c9a3d", "#88b04a", "#a7c55d", "#c9dc88", "#f1f2d2"],
      haze: ["#3d6a30", "#4f7d3a", "#638f47", "#7ba35c", "#95b677", "#b0c996", "#c9dab6"],
      sky: ["#3f8fd6", "#a9d4ef"],
      sun: ["#e3f1f4", "#e9f4f2", "#eff7ef", "#f5f9ec", "#fafbea", "#fffbe2"],
      materials: { bark: ["#3b2819", "#5c3f26", "#7d5a38"], dirt: ["#8a6a42", "#a8865a", "#c4a578"] },
    },
    // Midnight blue (Grace's call: "isn't forest at night more of a midnight blue?"),
    // darker than the rest; the fireflies are soft warm orange.
    night: {
      ramp: ["#04060c", "#070b16", "#0b1120", "#10182b", "#162036", "#1d2a43", "#263551", "#324262", "#435378", "#c8d0e0"],
      haze: ["#070b16", "#0a1020", "#0e1629", "#131c33", "#18233d", "#1e2a48", "#253253"],
      sky: ["#03050b", "#0e1830"],
      lift: 1.7,
      materials: { bark: ["#0a0a10", "#15141c", "#211e28"], dirt: ["#141620", "#1c1f2b", "#262a38"] },
    },
  },
  warehouse: {
    // Warm concrete in daylight; dark neutral steel at night under warm lamps.
    day: {
      ramp: ["#1c1a1c", "#2e2a2b", "#443e3c", "#5c544f", "#766c64", "#928679", "#ad9f8e", "#c8b9a4", "#e0d3bd", "#f5ecda"],
      haze: ["#5c544f", "#6a615a", "#766c64", "#847869", "#928679", "#a09382", "#ad9f8e"],
      sky: ["#c8b9a4", "#e0d3bd"],
    },
    night: {
      ramp: ["#0b0c0b", "#141614", "#1e201d", "#292c28", "#353934", "#434741", "#545851", "#686d64", "#80857b", "#d9dcd4"],
      haze: ["#1e201d", "#232622", "#292c28", "#2f332e", "#353934", "#3c403a", "#434741"],
      sky: ["#0b0c0b", "#1e201d"],
    },
  },
};

/** How much night lifts: the diorama was designed near black. */
const LIFT = { night: { gain: 2.6, gamma: 0.8 }, day: { gain: 1, gamma: 1 } };

/**
 * The figure's own colours, the same in every location (so he never turns
 * green in the forest): each part as [shade, base, lit]. The hoodie is black (Grace).
 */
const FIGURE: Record<TimeKey, Record<string, string>> = {
  day: { hair: "#161416", skin: "#f0dcc8", nose: "#d4b69c", hood: "#1d1d20", sleeve: "#1d1d20", pocket: "#131315", trousers: "#3a3a3c", shoes: "#161416", sole: "#f5f0e6", eyes: "#161416", phone: "#6f706c" },
  night: { hair: "#080908", skin: "#b0aba1", nose: "#8b8479", hood: "#101012", sleeve: "#101012", pocket: "#08080a", trousers: "#18191a", shoes: "#080908", sole: "#c9c8c1", eyes: "#080908", phone: "#4c4e4b" },
};

export type PixelPalette = {
  ramp: string[];
  haze: string[];
  sky: [string, string];
  /** Sun rings outer → disc (day), or the moon's, from the sky and the accent (night); null = the scene's own. */
  rings: string[] | null;
  accents: string[];
  warms: string[];
  paints: string[];
  /** A facade colour (variant, haze): near ones strong, fading into the haze with distance. */
  facade: (v: number, t: number) => string;
  facadeColours: string[];
  materials: Record<string, [string, string, string]>;
  /** A figure part's colour, a step lighter (+1) or darker (−1). */
  figure: (region: string, shade: number) => string;
  grade: (c: string) => string;
  step: (haze: number) => string;
};

export function pixelPalette(look: Look): PixelPalette {
  const a = look.accent;
  const base = PALETTES[look.place][look.time];
  // Tinted palettes (the OG city night) swap their 4i green for the accent.
  const t = (c: string) => (base.tinted ? retint(c, a) : c);
  const lp: LocPal = base.tinted ? { ...base, ramp: base.ramp.map(t), haze: base.haze.map(t), sky: [t(base.sky[0]), t(base.sky[1])] } : base;
  const night = look.time === "night";
  const ramp = lp.ramp;
  // Five accent steps: two deep ones, mid, the accent, and a light.
  const accents = [mix("#0a0a0a", a, 0.16), mix("#0a0a0a", a, 0.3), mix("#0a0a0a", a, 0.6), a, mix(a, "#ffffff", 0.55)];
  // The warm practicals: lamp light, bulbs, lit windows (night only).
  const warms = night ? [mix("#0a0a0a", WARM, 0.45), WARM, mix(WARM, "#ffffff", 0.55), mix("#0a0a0a", EMBER, 0.5), EMBER] : [];
  // Night: a moon glowing in the accent, brightening toward the disc. The city's
  // night rings are its approved, pinned ones (null here: use the scene's own).
  const rings = lp.sun ?? (look.place === "city" ? null : [0.1, 0.18, 0.28, 0.4, 0.55].map((k) => mix(lp.sky[1], mix(a, "#ffffff", 0.3), k)).concat(mix(a, "#ffffff", 0.45)));
  const figBase = FIGURE[look.time];
  const shadeTo = night ? ramp[0] : ramp[1];
  const figure = (region: string, shade: number) => {
    const c = figBase[region] ?? figBase.hood;
    return shade < 0 ? mix(c, shadeTo, 0.35) : shade > 0 ? mix(c, night ? "#ffffff" : "#fff3dc", 0.22) : c;
  };
  // Paint (safety lines) keeps its own yellow, in two shades.
  const paints = [mix(PAINT, ramp[1], 0.35), PAINT];
  const lit = [...accents, ...warms, ...paints].map(rgbOf);
  const lum = (c: string) => {
    const [r, g, b] = rgbOf(c);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const rampL = ramp.map(lum);
  const gain = lp.lift ?? LIFT[look.time].gain, gamma = lp.lift === 1 ? 1 : LIFT[look.time].gamma;
  const cache = new Map<string, string>();
  const nearestBy = (L: number, ls: number[]) => ls.reduce((best, v, i) => (Math.abs(v - L) < Math.abs(ls[best] - L) ? i : best), 0);
  const grade = (c: string): string => {
    if (!c.startsWith("#") || c.length !== 7) return c;
    let out = cache.get(c);
    if (out) return out;
    const [r, g, b] = rgbOf(c);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    const L = lum(c);
    if (sat > 0.55 && max > 90) {
      // Light: the nearest of the accent and warm families.
      let bi = 0, bd = Infinity;
      lit.forEach(([lr, lg, lb], i) => {
        const dd = (lr - r) ** 2 + (lg - g) ** 2 + (lb - b) ** 2;
        if (dd < bd) { bd = dd; bi = i; }
      });
      out = [...accents, ...warms, ...paints][bi];
    } else {
      // Everything else: a step of the location's ramp, by lightness (lifted at night).
      const lifted = L > 0.8 ? L : Math.min(1, L * gain) ** gamma;
      out = ramp[nearestBy(lifted, rampL)];
    }
    cache.set(c, out);
    return out;
  };
  // Facades at three distances: near, mid, far (each mixed further into the haze).
  const fac = (lp.facades ?? []).map((c) => (c === "ACCENT" ? mix(mix(a, "#8a8a80", 0.35), "#eadcc0", 0.45) : c)).map((c) => [0, 1, 2].map((k) => mix(c, lp.haze[k * 2], 0.2 + k * 0.2)));
  const mats = lp.materials ?? {};
  const facade = (v: number, t: number) => fac[v]?.[Math.max(0, Math.min(2, Math.round(t * 4)))] ?? lp.haze[0];
  const step = (h: number) => lp.haze[Math.max(0, Math.min(lp.haze.length - 1, Math.round(h * (lp.haze.length - 1))))];
  return { ramp, haze: lp.haze, sky: lp.sky, rings, accents, warms, paints, facade, facadeColours: fac.flat(), materials: mats, figure, grade, step };
}

/* ---------- painting ---------- */

let filterOK: boolean | null = null;
function canFilter(ctx: CanvasRenderingContext2D): boolean {
  if (filterOK === null) {
    ctx.filter = "blur(1px)";
    filterOK = ctx.filter === "blur(1px)";
    ctx.filter = "none";
  }
  return filterOK;
}

function glowStops(id: Glow, look: Look, grade: (c: string) => string): [number, string, number][] {
  const a = grade(look.accent);
  if (id === "accent") return [[0, a, 0.55], [0.4, a, 0.16], [1, a, 0]];
  if (id === "paper") return [[0, PAPER, 0.5], [0.4, PAPER, 0.12], [1, PAPER, 0]];
  if (id === "warm" || id === "ember") {
    const c = id === "warm" ? WARM : EMBER;
    return [[0, c, 0.6], [0.4, c, 0.2], [1, c, 0]];
  }
  if (id === "sun") {
    // By day the sun's own warm white; at night, the accent's glow.
    const c = look.time === "day" ? "#fff4d6" : a;
    return [[0, c, 0.55], [0.4, c, 0.16], [1, c, 0]];
  }
  return [[0, "#ffffff", 0.45], [0.55, a, 0.12], [1, a, 0]];
}

const rgba = (c: string, a: number) => {
  const [r, g, b] = rgbOf(c);
  return `rgba(${r},${g},${b},${a})`;
};

function paintShape(ctx: CanvasRenderingContext2D, s: Shape, look: Look, pp: PixelPalette) {
  const grade = pp.grade;
  const path = new Path2D(s.d);
  ctx.globalAlpha = s.opacity ?? 1;
  if (s.grad) {
    fillGlow(ctx, path, s.grad, look, grade);
    return;
  }
  if (s.region !== undefined) {
    ctx.fillStyle = pp.figure(s.region, s.shadeStep ?? 0);
    ctx.fill(path);
  } else if (s.material && pp.materials[s.material]) {
    const [dk, md, lt] = pp.materials[s.material];
    ctx.fillStyle = s.dither ? mix(md, lt, s.dither) : md;
    void dk;
    ctx.fill(path);
  } else if (s.facade !== undefined) {
    ctx.fillStyle = pp.facade(s.facade[0], s.facade[1]);
    ctx.fill(path);
  } else if (s.sunRing !== undefined) {
    ctx.fillStyle = pp.rings ? pp.rings[s.sunRing] : grade(s.fill ?? "#000000");
    ctx.fill(path);
  } else if (s.ramp !== undefined || s.accentStep !== undefined) {
    const fam = s.ramp !== undefined ? pp.ramp : pp.accents;
    const i = (s.ramp ?? s.accentStep!) + (s.shadeStep ?? 0);
    ctx.fillStyle = fam[Math.max(0, Math.min(fam.length - 1, i))];
    ctx.fill(path);
  } else if (s.fill && s.haze !== undefined && s.fog) {
    // A layer in its fog: its own step at the top, two steps lighter at its base.
    const g = ctx.createLinearGradient(0, s.fog[0], 0, s.fog[1]);
    g.addColorStop(0, pp.step(s.haze));
    g.addColorStop(0.55, pp.step(s.haze));
    g.addColorStop(1, pp.step(s.haze + 0.34));
    ctx.fillStyle = g;
    ctx.fill(path);
  } else if (s.fill) {
    const base = s.haze !== undefined ? pp.step(s.haze) : grade(s.fill);
    // A textured surface: some of the next lighter shade, which the dither turns to dots.
    ctx.fillStyle = s.dither ? mix(base, lighter(pp, base), s.dither) : base;
    ctx.fill(path);
  }
  if (s.stroke) {
    ctx.strokeStyle = grade(s.stroke);
    ctx.lineWidth = s.strokeWidth ?? 1;
    ctx.lineCap = "round";
    ctx.stroke(path);
  }
}

/** The next lighter ramp step after a ramp colour. */
function lighter(pp: PixelPalette, c: string): string {
  for (const fam of [pp.ramp, pp.haze]) {
    const i = fam.indexOf(c);
    if (i >= 0) return i < fam.length - 1 ? fam[i + 1] : c;
  }
  return c;
}

/** A radial glow, stretched to an ellipse, clipped to the shape's outline. */
function fillGlow(ctx: CanvasRenderingContext2D, path: Path2D, gr: NonNullable<Shape["grad"]>, look: Look, grade: (c: string) => string) {
  ctx.save();
  ctx.clip(path);
  ctx.translate(gr.x, gr.y);
  ctx.scale(1, (gr.ry || 1) / (gr.rx || 1));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr.rx || 1);
  for (const [o, c, a] of glowStops(gr.id, look, grade)) g.addColorStop(o, rgba(c, a));
  ctx.fillStyle = g;
  ctx.fillRect(-gr.rx, -gr.rx, gr.rx * 2, gr.rx * 2);
  ctx.restore();
}

type Surfaces = { main: HTMLCanvasElement; layer: HTMLCanvasElement; tiny: HTMLCanvasElement; sprite: HTMLCanvasElement };
const surfaces = new WeakMap<HTMLCanvasElement, Surfaces>();

function make(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Paint a frame of shapes into `out` (PW × PH) as pixel art. */
/**
 * `moving`: a camera move is playing. The defocus scatter is fixed to the screen,
 * so under a moving picture it boils; while moving, blur stays smooth (the
 * dither still pixelates it). `spritePx`: hold each figure's sprite-pixel size
 * (e.g. at the move's first frame) so it doesn't pop between block sizes mid-move.
 */
export function paintPixels(out: HTMLCanvasElement, frame: Frame, look: Look, opts: { moving?: boolean; spritePx?: number[] } = {}) {
  let sf = surfaces.get(out);
  if (!sf) {
    sf = { main: make(PW, PH), layer: make(PW, PH), tiny: make(PW, PH), sprite: make(PW + 4, PH + 4) };
    surfaces.set(out, sf);
  }
  const pp = pixelPalette(look);
  const grade = pp.grade;
  const ctx = sf.main.getContext("2d", { willReadFrequently: true })!;
  const lctx = sf.layer.getContext("2d")!;
  const filter = canFilter(ctx);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  // The sky: darker overhead, lighter toward the horizon; dithering bands it.
  const hy = frame.horizon * SCALE;
  const sky = ctx.createLinearGradient(0, hy - PH * 0.55, 0, hy);
  sky.addColorStop(0, pp.sky[0]);
  sky.addColorStop(1, pp.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, PW, PH);

  const shapes = [...frame.back, ...frame.items];
  // Runs of shapes with the same blur and blend are painted to one layer, blurred once.
  // A figure is painted whole, as a sprite, where its farthest piece falls.
  const done = new Set<number>();
  let i = 0;
  while (i < shapes.length) {
    const g = shapes[i].group;
    if (g !== undefined) {
      if (!done.has(g)) {
        done.add(g);
        const info = frame.figures.find((f) => f.group === g);
        const held = opts.spritePx?.[g];
        if (info) paintSprite(ctx, sf.sprite, shapes.filter((q) => q.group === g), held ? { ...info, spritePx: held } : info, look, pp, filter);
      }
      i++;
      continue;
    }
    const { blur, blend } = shapes[i];
    let j = i;
    while (j < shapes.length && shapes[j].group === undefined && shapes[j].blur === blur && shapes[j].blend === blend) j++;
    const sd = BLUR_LEVELS[blur] * SCALE;
    ctx.globalCompositeOperation = blend ?? "source-over";
    if (sd < 0.35) {
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      for (let k = i; k < j; k++) paintShape(ctx, shapes[k], look, pp);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalAlpha = 1;
      lctx.clearRect(0, 0, PW, PH);
      lctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      for (let k = i; k < j; k++) paintShape(lctx, shapes[k], look, pp);
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      // Defocus as pixel art: the layer is blurred, then its pixels fan out, each
      // one taken from a random spot within the blur's reach, so what's out of
      // focus dissolves into scattered pixels while the subject stays crisp. The
      // scatter pattern is fixed, so a still frame doesn't shimmer.
      const tctx = sf.tiny.getContext("2d", { willReadFrequently: true })!;
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, PW, PH);
      if (sd < 1.2) {
        if (filter) ctx.filter = `blur(${sd.toFixed(2)}px)`;
        ctx.drawImage(sf.layer, 0, 0);
        ctx.filter = "none";
      } else {
        const soft = sd * 0.6;
        if (filter) {
          tctx.filter = `blur(${soft.toFixed(2)}px)`;
          tctx.drawImage(sf.layer, 0, 0);
          tctx.filter = "none";
        } else {
          // No canvas filters (older Safari): shrink and grow back, smoothed.
          const f = Math.max(1, soft * 1.6);
          const w = Math.max(1, Math.round(PW / f)), h = Math.max(1, Math.round(PH / f));
          tctx.imageSmoothingEnabled = true;
          tctx.drawImage(sf.layer, 0, 0, w, h);
          tctx.drawImage(sf.tiny, 0, 0, w, h, 0, 0, PW, PH);
        }
        if (opts.moving) {
          ctx.drawImage(sf.tiny, 0, 0);
        } else {
          scatter(tctx, lctx, sd * 1.3);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sf.layer, 0, 0);
        }
      }
    }
    i = j;
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  // The whole picture is reduced to the palette: ramp, accent family, white.
  const figs = Object.keys(FIGURE.day).flatMap((k) => [-1, 0, 1].map((sh) => pp.figure(k, sh)));
  const used = [...new Set([...pp.ramp, ...pp.haze, ...pp.sky, ...(pp.rings ?? []), ...pp.accents, ...pp.warms, ...pp.paints, ...pp.facadeColours, ...Object.values(pp.materials).flat(), ...figs, "#ffffff"])];
  quantize(ctx, used.map(rgbOf));

  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(sf.main, 0, 0);
}

/* ---------- defocus scatter ---------- */

/** A fixed random offset per pixel, inside the unit disk (x, y pairs). */
const SCATTER = (() => {
  const t = new Float32Array(PW * PH * 2);
  let a = 0x2545f491;
  const rnd = () => {
    a ^= a << 13; a ^= a >>> 17; a ^= a << 5;
    return ((a >>> 0) / 4294967296) * 2 - 1;
  };
  for (let i = 0; i < PW * PH; i++) {
    let x = 0, y = 0;
    do { x = rnd(); y = rnd(); } while (x * x + y * y > 1);
    t[i * 2] = x; t[i * 2 + 1] = y;
  }
  return t;
})();

/** Fan a blurred layer's pixels out: each takes the colour from a random spot within `reach`. */
function scatter(from: CanvasRenderingContext2D, to: CanvasRenderingContext2D, reach: number) {
  const src = from.getImageData(0, 0, PW, PH).data;
  const img = to.createImageData(PW, PH);
  const d = img.data;
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const i = y * PW + x;
      const sx = Math.min(PW - 1, Math.max(0, Math.round(x + SCATTER[i * 2] * reach)));
      const sy = Math.min(PH - 1, Math.max(0, Math.round(y + SCATTER[i * 2 + 1] * reach)));
      const o = i * 4, q = (sy * PW + sx) * 4;
      d[o] = src[q]; d[o + 1] = src[q + 1]; d[o + 2] = src[q + 2]; d[o + 3] = src[q + 3];
    }
  }
  to.setTransform(1, 0, 0, 1, 0, 0);
  to.putImageData(img, 0, 0);
}

/* ---------- figure sprites ---------- */

/**
 * Paint a figure as a sprite: its shapes rasterized onto a grid of sprite
 * pixels (k screen pixels each, k from its size in frame, 1–6), hard-edged and
 * snapped to the palette, then a one-sprite-pixel ink outline round the outside,
 * a one-pixel rim light along its top edges, and the eyes as whole sprite
 * pixels. Scaled up by k with no smoothing, so close-ups get chunky pixels.
 */
function paintSprite(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  shapes: Shape[],
  info: Frame["figures"][number],
  look: Look,
  pp: PixelPalette,
  filter: boolean,
) {
  const k = Math.max(1, Math.min(6, Math.round(info.spritePx * SCALE)));
  const sw = Math.ceil(PW / k), sh = Math.ceil(PH / k);
  const sctx = canvas.getContext("2d", { willReadFrequently: true })!;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = "source-over";
  sctx.clearRect(0, 0, PW, PH);
  sctx.setTransform(SCALE / k, 0, 0, SCALE / k, 0, 0);
  const eyes: [number, number][] = [];
  for (const s of shapes) {
    if (s.eye) eyes.push(s.eye);
    else paintShape(sctx, s, look, pp);
  }
  sctx.setTransform(1, 0, 0, 1, 0, 0);

  const img = sctx.getImageData(0, 0, sw, sh);
  const d = img.data;
  // Snap to the figure's own colours (and the phone screen's accent).
  const flat = [...Object.keys(FIGURE.day).flatMap((k) => [-1, 0, 1].map((sh) => pp.figure(k, sh))), ...pp.accents].map(rgbOf);
  const solid = new Uint8Array(sw * sh);
  // Hard edges: a sprite pixel is either figure or not, and one palette colour.
  for (let p = 0; p < sw * sh; p++) {
    const o = p * 4;
    if (d[o + 3] < 128) { d[o + 3] = 0; continue; }
    solid[p] = 1;
    let best = 0, bd = Infinity;
    for (let c = 0; c < flat.length; c++) {
      const [pr, pg, pb] = flat[c];
      const dist = (pr - d[o]) ** 2 + (pg - d[o + 1]) ** 2 + (pb - d[o + 2]) ** 2;
      if (dist < bd) { bd = dist; best = c; }
    }
    [d[o], d[o + 1], d[o + 2], d[o + 3]] = [...flat[best], 255];
  }
  const set = (p: number, [r, g, b]: [number, number, number]) => {
    const o = p * 4;
    d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
  };
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < sw && y < sh && solid[y * sw + x] === 1;
  const ink = rgbOf(pp.figure("eyes", 0)), rim = rgbOf(info.rim.length === 7 ? pp.grade(info.rim) : info.rim);
  // Rim light: figure pixels with open sky above them (not where the figure
  // simply runs off the top of the frame).
  for (let y = 1; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (at(x, y) && !at(x, y - 1)) set(y * sw + x, rim);
  }
  // Outline: empty pixels touching the figure.
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) set(y * sw + x, ink);
  }
  // Eyes: one pixel wide, two tall (one when blinking), on the face only.
  for (const [ex, ey] of eyes) {
    const x = Math.floor((ex * SCALE) / k), y = Math.floor((ey * SCALE) / k);
    if (!at(x, y)) continue;
    set(y * sw + x, ink);
    if (!info.blink && at(x, y + 1)) set((y + 1) * sw + x, ink);
  }
  sctx.putImageData(img, 0, 0);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = false;
  const sd = BLUR_LEVELS[info.blur] * SCALE;
  if (sd >= 0.35 && filter) ctx.filter = `blur(${sd.toFixed(2)}px)`;
  ctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, sw * k, sh * k);
  ctx.filter = "none";
  ctx.restore();
}

/* ---------- quantize + dither ---------- */

// 4×4 Bayer thresholds, 0..1.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

function quantize(ctx: CanvasRenderingContext2D, pal: [number, number, number][]) {
  const img = ctx.getImageData(0, 0, PW, PH);
  const d = img.data;
  // Per distinct input colour: the two nearest palette colours and how far between them.
  const memo = new Map<number, [number, number, number]>();
  const dist = (p: [number, number, number], r: number, g: number, b: number) => {
    // Weighted RGB distance, close enough to perceived difference for this.
    const dr = p[0] - r, dg = p[1] - g, db = p[2] - b;
    return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
  };
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const o = (y * PW + x) * 4;
      const r = d[o], g = d[o + 1], b = d[o + 2];
      const key = (r << 16) | (g << 8) | b;
      let m = memo.get(key);
      if (!m) {
        let a = 0, bi = 0, da = Infinity, db = Infinity;
        for (let i = 0; i < pal.length; i++) {
          const di = dist(pal[i], r, g, b);
          if (di < da) { db = da; bi = a; da = di; a = i; }
          else if (di < db) { db = di; bi = i; }
        }
        // Where the colour sits on the line between the two: 0 = first, 1 = second.
        const pa = pal[a], pb = pal[bi];
        const vx = pb[0] - pa[0], vy = pb[1] - pa[1], vz = pb[2] - pa[2];
        const len = vx * vx + vy * vy + vz * vz;
        const t = len ? Math.max(0, Math.min(1, ((r - pa[0]) * vx + (g - pa[1]) * vy + (b - pa[2]) * vz) / len)) : 0;
        m = [a, bi, t];
        memo.set(key, m);
      }
      const p = pal[m[2] > BAYER[(y & 3) * 4 + (x & 3)] ? m[1] : m[0]];
      d[o] = p[0];
      d[o + 1] = p[1];
      d[o + 2] = p[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
