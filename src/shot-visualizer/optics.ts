/* ============================================================
   Lens maths. Pure functions, no three.js, so the numbers the tool
   shows can be tested on their own (optics.test.ts).

   Camera: full frame, 36 × 24mm, shown at 16:9 (the sensor's full
   width, cropped top and bottom). Distances are metres; focal lengths
   and circles of confusion are millimetres.
   ============================================================ */

export const SENSOR_W_MM = 36;
export const ASPECT = 16 / 9;
/** Full-frame circle of confusion, the usual 0.03mm. */
export const COC_MM = 0.03;

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Horizontal field of view, degrees. */
export function hFov(focalMm: number): number {
  return deg(2 * Math.atan(SENSOR_W_MM / 2 / focalMm));
}

/** Vertical field of view at 16:9, degrees. three.js cameras take this one. */
export function vFov(focalMm: number): number {
  const sensorH = SENSOR_W_MM / ASPECT;
  return deg(2 * Math.atan(sensorH / 2 / focalMm));
}

/**
 * How far the camera stands so a frame `frameHeightM` tall fills the picture
 * at this focal length. This is the whole lesson: same shot size, different
 * lens, different distance, different background.
 */
export function distanceForFrame(frameHeightM: number, focalMm: number): number {
  const half = (vFov(focalMm) * Math.PI) / 360;
  return frameHeightM / 2 / Math.tan(half);
}

export type DepthOfField = {
  /** Metres from the camera. */
  near: number;
  /** Metres; Infinity when focused at or past the hyperfocal distance. */
  far: number;
  hyperfocal: number;
};

/** Near and far limits of acceptable focus for a subject `focusM` away. */
export function depthOfField(focalMm: number, fStop: number, focusM: number): DepthOfField {
  const f = focalMm;
  const s = focusM * 1000;
  const H = (f * f) / (fStop * COC_MM) + f;
  const near = (s * (H - f)) / (H + s - 2 * f);
  const far = s >= H ? Infinity : (s * (H - f)) / (H - s);
  return { near: near / 1000, far: far === Infinity ? Infinity : far / 1000, hyperfocal: H / 1000 };
}

/**
 * Blur-circle diameter on the sensor (mm) for something `xM` away while
 * focused at `focusM`. Zero at the focus distance, and it levels off
 * towards infinity — which is why a far background only gets so soft.
 */
export function blurMm(focalMm: number, fStop: number, focusM: number, xM: number): number {
  const f = focalMm;
  const s = focusM * 1000;
  const x = xM * 1000;
  if (s <= f || x <= 0) return 0;
  return ((f * f) / (fStop * (s - f))) * (Math.abs(x - s) / x);
}

/** A metre figure the way a camera assistant would say it. */
export function formatMetres(m: number): string {
  if (!Number.isFinite(m)) return "∞";
  if (m < 1) return `${Math.round(m * 100)} cm`;
  if (m < 10) return `${m.toFixed(2)} m`;
  return `${m.toFixed(1)} m`;
}
