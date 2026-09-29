"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { drawFrame } from "./render2d";
import { paintPixels, spriteRows, PW, PH } from "./pixel";
import { currentRig, type Clock } from "./clock";
import { rig, type Shot } from "./shots";
import type { Look } from "./scenes";

/* The camera view: render2d's scene, painted as pixel art into a small
   canvas and scaled up with hard edges. Repaints every frame only while
   a move plays; otherwise once per change. */

export default function Frame2D({ shot, look, clock, playing, canvasRef }: {
  shot: Shot;
  look: Look;
  clock: MutableRefObject<Clock>;
  playing: boolean;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
}) {
  const [tick, setTick] = useState(0);
  const own = useRef<HTMLCanvasElement | null>(null);
  const animating = playing && shot.move !== "static";
  const [blink, setBlink] = useState(false);

  // Blink every 2.5–5.5s, for 130ms. Only repaints on the two changes.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => {
          setBlink(false);
          next();
        }, 130);
      }, 2500 + Math.random() * 3000);
    };
    next();
    return () => clearTimeout(t);
  }, []);

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

  // During a move, each figure's sprite keeps its first frame's pixel count.
  const rows = useMemo(
    () => (animating ? drawFrame(rig(shot, 0), shot.fStop, look).figures.map((f) => spriteRows(f.heightPx)) : undefined),
    [animating, shot, look],
  );

  useLayoutEffect(() => {
    if (own.current) {
      paintPixels(own.current, drawFrame(currentRig(shot, clock.current), shot.fStop, look, blink), look, { moving: animating, spriteRows: rows });
    }
  });

  return (
    <canvas
      ref={(c) => {
        own.current = c;
        canvasRef.current = c;
      }}
      width={PW}
      height={PH}
      data-tick={tick}
      role="img"
      aria-label="Camera view"
      style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }}
    />
  );
}
