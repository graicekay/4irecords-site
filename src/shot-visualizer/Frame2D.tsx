"use client";

import { useEffect, useState, type MutableRefObject, type Ref } from "react";
import { drawFrame, W, H, BLUR_LEVELS, type Shape } from "./render2d";
import { currentRig, type Clock } from "./clock";
import type { Shot } from "./shots";

/* The camera view: render2d's shapes in an SVG. Redraws every frame only
   while a move plays; otherwise once per change. */

function Paint({ s }: { s: Shape }) {
  return (
    <path
      d={s.d}
      fill={s.fill ?? "none"}
      stroke={s.stroke}
      strokeWidth={s.strokeWidth}
      strokeLinecap={s.stroke ? "round" : undefined}
      opacity={s.opacity}
      filter={s.blur ? `url(#svBlur${s.blur})` : undefined}
    />
  );
}

export default function Frame2D({ shot, clock, playing, svgRef }: {
  shot: Shot;
  clock: MutableRefObject<Clock>;
  playing: boolean;
  svgRef: Ref<SVGSVGElement>;
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

  const { back, items } = drawFrame(currentRig(shot, clock.current), shot.fStop);

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Camera view"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        {BLUR_LEVELS.map((sd, i) =>
          i === 0 ? null : (
            <filter key={i} id={`svBlur${i}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation={sd} />
            </filter>
          ),
        )}
        <linearGradient id="svSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050605" />
          <stop offset="1" stopColor="#0c0f0c" />
        </linearGradient>
        <radialGradient id="svWallGlow">
          <stop offset="0" stopColor="#57ff52" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#57ff52" stopOpacity="0.04" />
          <stop offset="1" stopColor="#57ff52" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="svFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#111411" />
          <stop offset="1" stopColor="#1c201b" />
        </linearGradient>
        <linearGradient id="svClay" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#ece6da" />
          <stop offset="0.55" stopColor="#cfc8bb" />
          <stop offset="1" stopColor="#8f887d" />
        </linearGradient>
        <radialGradient id="svBokehWarm">
          <stop offset="0" stopColor="#fff4de" />
          <stop offset="0.8" stopColor="#ffd9a0" stopOpacity="0.92" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="svBokehGreen">
          <stop offset="0" stopColor="#e2ffe0" />
          <stop offset="0.8" stopColor="#57ff52" stopOpacity="0.92" />
          <stop offset="1" stopColor="#57ff52" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="svHaloWarm">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="svHaloGreen">
          <stop offset="0" stopColor="#57ff52" stopOpacity="0.5" />
          <stop offset="1" stopColor="#57ff52" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="svVignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#svSky)" />
      {back.map((s, i) => <Paint key={`b${i}`} s={s} />)}
      {items.map((s, i) => <Paint key={`i${i}`} s={s} />)}
      <rect width={W} height={H} fill="url(#svVignette)" pointerEvents="none" />
    </svg>
  );
}
