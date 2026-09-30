"use client";

import { useEffect, useRef } from "react";

import { startSmoke } from "@/lib/fluidSmoke";
import { PRODUCTIONS_SITE } from "@/lib/links";

/**
 * 4i Productions' hero behind the /visuals header: the page is that site's
 * work, so it borrows its look (Grace, 29 Sep). The same layers as there: its
 * hero video (loaded from 4iproductions.com rather than copied: 18 MB), the
 * darkening gradient, and the green smoke (src/lib/fluidSmoke.ts, copied
 * verbatim from 4iproductions-site) on top. The whole stack fades out
 * downward, so it reads as a gradient rather than a box.
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
      <video autoPlay muted loop playsInline preload="auto" poster={`${PRODUCTIONS_SITE}/hero-poster.jpg`}>
        <source src={`${PRODUCTIONS_SITE}/hero.mp4`} type="video/mp4" />
      </video>
      <div className="visuals-smoke-overlay" />
      <canvas ref={canvasRef} />
    </div>
  );
}
