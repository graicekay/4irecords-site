"use client";

import { useEffect, useRef } from "react";

import { startSmoke } from "@/lib/fluidSmoke";

/**
 * 4i Productions' green hero smoke, behind the /visuals header: the page is
 * that site's work, so it borrows its look (Grace, 29 Sep). The same fluid
 * simulation (src/lib/fluidSmoke.ts, copied verbatim from 4iproductions-site),
 * faded out downward so it reads as a soft out-of-focus gradient, like the
 * blurred stickers behind the other headers.
 *
 * Paused off screen; one still frame for reduced motion.
 */
export function VisualsSmoke() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smoke = startSmoke(canvas, { still });
    const observer = new IntersectionObserver(
      ([entry]) => smoke.setRunning(!still && entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      smoke.stop();
    };
  }, []);

  return (
    <div className="visuals-smoke" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
