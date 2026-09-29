"use client";

import { useEffect, useState, type MutableRefObject, type Ref } from "react";
import { drawFrame, palette, W, H, BLUR_LEVELS, PAPER, type Shape } from "./render2d";
import { currentRig, type Clock } from "./clock";
import type { Shot } from "./shots";
import type { Look } from "./scenes";

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
      style={s.blend ? { mixBlendMode: s.blend } : undefined}
      filter={s.blur ? `url(#svBlur${s.blur})` : undefined}
    />
  );
}

export default function Frame2D({ shot, look, clock, playing, svgRef }: {
  shot: Shot;
  look: Look;
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

  const { sky, back, items } = drawFrame(currentRig(shot, clock.current), shot.fStop, look);
  const a = look.accent;
  const pool = palette(look).pin("#e8ffe6");

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
        {/* Paper tooth: fine grain, laid over the whole print once. */}
        <filter id="svTooth" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.9 0.9 0.9 0 -1.05" />
        </filter>
        <radialGradient id="svHaloAccent">
          <stop offset="0" stopColor={a} stopOpacity="0.55" />
          <stop offset="0.4" stopColor={a} stopOpacity="0.16" />
          <stop offset="1" stopColor={a} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="svHaloPaper">
          <stop offset="0" stopColor={PAPER} stopOpacity="0.5" />
          <stop offset="0.4" stopColor={PAPER} stopOpacity="0.12" />
          <stop offset="1" stopColor={PAPER} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="svPool">
          <stop offset="0" stopColor={look.time === "night" ? pool : "#ffffff"} stopOpacity="0.5" />
          <stop offset="0.55" stopColor={a} stopOpacity="0.12" />
          <stop offset="1" stopColor={a} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="svVignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={look.time === "night" ? 0.5 : 0.22} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={sky} />
      {back.map((s, i) => <Paint key={`b${i}`} s={s} />)}
      {items.map((s, i) => <Paint key={`i${i}`} s={s} />)}
      <rect width={W} height={H} filter="url(#svTooth)" opacity="0.5" style={{ mixBlendMode: "soft-light" }} pointerEvents="none" />
      <rect width={W} height={H} fill="url(#svVignette)" pointerEvents="none" />
    </svg>
  );
}
