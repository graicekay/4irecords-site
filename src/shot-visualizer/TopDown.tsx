"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import { currentRig, type Clock } from "./clock";
import { depthOfField, hFov, formatMetres } from "./optics";
import type { Shot } from "./shots";
import s from "./visualizer.module.css";

/* The plan view: subject, camera, field of view and the band that's in
   focus, to scale. Redrawn every frame only while a move plays. */

const W = 320;
const H = 320;
const PILLARS: [number, number][] = [[-2.4, -3], [2.8, -4.6], [-4.2, -7.5], [4.6, -9.5], [-7.5, -11.5], [8, -6]];

function niceStep(m: number): number {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
  return steps.find((x) => x >= m) ?? 100;
}

export default function TopDown({ shot, clock, playing }: {
  shot: Shot;
  clock: MutableRefObject<Clock>;
  playing: boolean;
}) {
  const [, setTick] = useState(0);
  const animating = playing && shot.move !== "static";
  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  const r = currentRig(shot, clock.current);
  const [cx, , cz] = r.position;
  const dx = r.target[0] - cx, dz = r.target[2] - cz;
  const flat = Math.hypot(dx, dz);
  // Straight down (bird's eye): point the wedge at the subject anyway.
  const heading = flat < 1e-3 ? Math.atan2(-cx, -cz) : Math.atan2(dx, dz);
  const half = (hFov(r.focal) * Math.PI) / 360;
  const { near, far } = depthOfField(r.focal, shot.fStop, r.focus);

  // Fit subject + camera, with room either side.
  const span = Math.max(Math.hypot(cx, cz) * 1.25, 3.2);
  const scale = (Math.min(W, H) * 0.8) / span;
  const midX = cx / 2, midZ = cz / 2;
  const px = (x: number) => W / 2 + (x - midX) * scale;
  const py = (z: number) => H / 2 + (z - midZ) * scale;

  const reach = Math.hypot(cx, cz) + span;
  const ray = (a: number, len: number) => [px(cx + Math.sin(a) * len), py(cz + Math.cos(a) * len)];
  const [l1x, l1y] = ray(heading - half, reach);
  const [r1x, r1y] = ray(heading + half, reach);

  // In-focus band: an annular sector from `near` to `far` (clipped).
  const farR = Math.min(Number.isFinite(far) ? far : reach, reach);
  const band = (() => {
    const a0 = heading - half, a1 = heading + half;
    const [nx0, ny0] = ray(a0, near), [nx1, ny1] = ray(a1, near);
    const [fx0, fy0] = ray(a0, farR), [fx1, fy1] = ray(a1, farR);
    const large = half * 2 > Math.PI ? 1 : 0;
    // SVG y runs down and our angle runs from +z, so arcs sweep with flag 0.
    return [
      `M ${nx0} ${ny0}`,
      `L ${fx0} ${fy0}`,
      `A ${farR * scale} ${farR * scale} 0 ${large} 0 ${fx1} ${fy1}`,
      `L ${nx1} ${ny1}`,
      `A ${near * scale} ${near * scale} 0 ${large} 1 ${nx0} ${ny0}`,
      "Z",
    ].join(" ");
  })();

  const bar = niceStep(span / 4);
  const camAngle = (heading * 180) / Math.PI;

  return (
    <figure className={s.plan} aria-label="Top-down view of camera and subject">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        <defs>
          <clipPath id="sv-plan-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>
        <g clipPath="url(#sv-plan-clip)">
          <line x1={0} x2={W} y1={py(-15)} y2={py(-15)} className={s.planWall} />
          {PILLARS.map(([x, z]) => (
            <rect key={`${x},${z}`} x={px(x) - 0.225 * scale} y={py(z) - 0.225 * scale}
              width={Math.max(0.45 * scale, 2)} height={Math.max(0.45 * scale, 2)} className={s.planProp} />
          ))}
          <path d={`M ${px(cx)} ${py(cz)} L ${l1x} ${l1y} L ${r1x} ${r1y} Z`} className={s.planFov} />
          <path d={band} className={s.planFocus} />
          <circle cx={px(0)} cy={py(0)} r={Math.max(0.22 * scale, 3)} className={s.planSubject} />
          {r.partner && (
            <circle cx={px(r.partner.position[0])} cy={py(r.partner.position[2])}
              r={Math.max(0.22 * scale, 3)} className={s.planPartner} />
          )}
          <g transform={`translate(${px(cx)} ${py(cz)}) rotate(${-camAngle})`}>
            <rect x={-7} y={-12} width={14} height={11} className={s.planCam} />
            <path d="M -4 -1 L 4 -1 L 6 6 L -6 6 Z" className={s.planCam} />
          </g>
        </g>
        <g transform={`translate(12 ${H - 14})`}>
          <line x1={0} x2={bar * scale} y1={0} y2={0} className={s.planBar} />
          <text x={0} y={-6} className={s.planText}>{formatMetres(bar)}</text>
        </g>
      </svg>
      <figcaption className={s.planCaption}>
        Camera {formatMetres(r.focus)} from subject · sharp from {formatMetres(near)} to {formatMetres(far)}
      </figcaption>
    </figure>
  );
}
