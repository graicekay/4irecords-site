"use client";

import { useEffect, useRef } from "react";

/**
 * The record behind the hero type.
 *
 * Driven by requestAnimationFrame rather than a CSS animation, because the
 * brief is that it speeds up on hover and CSS can't do that smoothly: changing
 * `animation-duration` remaps where the playhead sits, so the disc jumps to a
 * new angle the moment the speed changes. Here the *speed* is eased toward its
 * target and the angle only ever accumulates, so it winds up and coasts back
 * down the way a turntable does.
 *
 * Idles near 33⅓ rpm for the obvious reason, and winds up to about four times
 * that on hover.
 */

/* Dust and scuffs.
 *
 * Concentric grooves are rotationally symmetric — they look identical at
 * every angle, so the disc could be spinning at any speed and the only proof
 * was the label. Off-centre marks are what make the rotation visible, which
 * matters most on the hero disc, where the label is half below the edge.
 *
 * Generated once at module scope from a fixed seed rather than Math.random
 * at render: the server and the browser have to produce the same specks or
 * React throws a hydration mismatch, and a dust pattern that reshuffles on
 * every render would shimmer.
 */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const rand = seeded(20260922);

const DUST = Array.from({ length: 90 }, () => {
  const angle = rand() * Math.PI * 2;
  const radius = 96 + rand() * 148;          // between the label and the rim
  return {
    cx: 256 + Math.cos(angle) * radius,
    cy: 256 + Math.sin(angle) * radius,
    r: 0.5 + rand() * 1.5,
    o: 0.05 + rand() * 0.22,
  };
});

/* Longer arcs, the scratches you can actually see turning. */
const SCUFFS = Array.from({ length: 11 }, () => {
  const radius = 104 + rand() * 138;
  const start = rand() * 360;
  const sweep = 4 + rand() * 13;             // degrees
  const pt = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(256 + Math.cos(a) * radius).toFixed(2)} ${(256 + Math.sin(a) * radius).toFixed(2)}`;
  };
  return {
    d: `M ${pt(start)} A ${radius} ${radius} 0 0 1 ${pt(start + sweep)}`,
    o: 0.05 + rand() * 0.13,
    w: 0.7 + rand() * 1.1,
  };
});

const IDLE_RPM = 33 + 1 / 3;
const HOVER_RPM = IDLE_RPM * 4;
/** How fast the speed itself changes. Higher is snappier; this is ~0.4s. */
const RAMP = 2.6;

export function SpinningRecord({ className = "hero-record" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Someone who asked for less motion gets the record, standing still.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* The disc itself is the hover target, not the box it sits in — the
       whole hero was winding it up, so it span faster whenever the pointer
       was anywhere near the headline.

       Hit-testing on an <svg> follows the painted shapes, so this is the
       disc rather than its bounding square, and the half below the hero's
       edge is clipped and therefore not hoverable either. */
    const hero = el;
    let angle = 0;
    let rpm = IDLE_RPM;
    let target = IDLE_RPM;
    let last = performance.now();
    let frame = 0;
    let visible = true;

    const onEnter = () => { target = HOVER_RPM; };
    const onLeave = () => { target = IDLE_RPM; };
    hero?.addEventListener("pointerenter", onEnter);
    hero?.addEventListener("pointerleave", onLeave);
    // A tap on a touch screen winds it up too, then lets it fall back.
    hero?.addEventListener("pointerdown", onEnter, { passive: true });
    hero?.addEventListener("pointerup", onLeave, { passive: true });
    hero?.addEventListener("pointercancel", onLeave, { passive: true });

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp: tab-switch jumps
      last = now;

      // Ease the speed toward its target, frame-rate independent.
      rpm += (target - rpm) * (1 - Math.exp(-RAMP * dt));
      angle = (angle + rpm * 6 * dt) % 360;        // 6 deg per rpm per second
      el.style.transform = `rotate(${angle}deg)`;

      frame = requestAnimationFrame(tick);
    };

    // Nothing spins while it's off screen or the tab is in the background —
    // a rAF loop runs whether or not anyone can see it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        cancelAnimationFrame(frame);
        if (visible && !document.hidden) {
          last = performance.now();
          frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && visible) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      hero?.removeEventListener("pointerenter", onEnter);
      hero?.removeEventListener("pointerleave", onLeave);
      hero?.removeEventListener("pointerdown", onEnter);
      hero?.removeEventListener("pointerup", onLeave);
      hero?.removeEventListener("pointercancel", onLeave);
    };
  }, []);

  /* Grooves as stroked circles rather than a texture: a dozen paths beat a
     bitmap that would have to be twice the size for a retina screen. */
  const grooves = [];
  for (let r = 196; r >= 92; r -= 7) {
    grooves.push(
      <circle
        key={r}
        cx="256" cy="256" r={r}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={r % 14 === 0 ? 0.055 : 0.03}
        strokeWidth="1"
      />,
    );
  }

  return (
    <svg
      ref={ref}
      className={className}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
    >
      {/* The disc. Not pure black — it has to separate from the page. */}
      <circle cx="256" cy="256" r="248" fill="#131313" />
      <circle cx="256" cy="256" r="248" fill="none" stroke="#ffffff" strokeOpacity="0.07" />

      {grooves}

      {/* What makes the spin readable away from the label. */}
      {SCUFFS.map((sc, i) => (
        <path key={`s${i}`} d={sc.d} fill="none" stroke="#ffffff"
              strokeOpacity={sc.o} strokeWidth={sc.w} strokeLinecap="round" />
      ))}
      {DUST.map((d, i) => (
        <circle key={`d${i}`} cx={d.cx.toFixed(2)} cy={d.cy.toFixed(2)}
                r={d.r.toFixed(2)} fill="#ffffff" fillOpacity={d.o} />
      ))}

      {/* The label, and the one thing on here that carries any colour. */}
      <circle cx="256" cy="256" r="84" fill="#57FF52" fillOpacity="0.7" />
      <path
        d="M286 0 L0 449 L0 531 L269 531 L269 675 L369 675 L369 531 L436 531 L436 680 L541 680 L541 171 L436 171 L436 447 L369 447 L369 0 Z M269 192 L269 447 L106 447 Z M436 0 L541 0 L541 110 L436 110 Z"
        fill="#0A0A0A"
        fillRule="evenodd"
        transform="translate(211.5 205.5) scale(0.1305)"
      />

      {/* Spindle hole. */}
      <circle cx="256" cy="256" r="9" fill="#0A0A0A" />
    </svg>
  );
}
