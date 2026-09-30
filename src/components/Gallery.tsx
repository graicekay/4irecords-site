"use client";

import { useEffect, useRef, useState } from "react";

/* The swipeable slides at the top of a pack page: the cover, then the
   contact sheets, so people see every file before they ask for it.
   Native scroll-snap does the swiping (touch, trackpad, drag on a
   phone); the arrows, dots and counter just drive and read the scroll. */
export function Gallery({ slides, label }: { slides: string[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setAt(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(slides.length - 1, i));
    const left = n * el.clientWidth;
    setAt(n);   // don't wait on the scroll event to move the counter
    el.scrollTo({ left, behavior: "smooth" });
    /* Some browsers drop a smooth scroll on a snap container (seen in a
       backgrounded Chrome tab); if nothing has moved, jump instead. */
    const from = el.scrollLeft;
    window.setTimeout(() => {
      if (el.scrollLeft === from && from !== left) el.scrollTo({ left });
    }, 250);
  };

  return (
    <div
      className="gallery"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
      }}
    >
      <div className="gallery-track" ref={track} tabIndex={0}>
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src} src={src} className="gallery-slide"
            alt={i === 0 ? "" : `${label}: contact sheet ${i} of ${slides.length - 1}`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>
      {slides.length > 1 && (
        <div className="gallery-bar">
          <button type="button" className="gallery-arrow" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous">←</button>
          <div className="gallery-dots">
            {slides.map((src, i) => (
              <button
                key={src} type="button" onClick={() => go(i)}
                className={i === at ? "gallery-dot is-on" : "gallery-dot"}
                aria-label={`Slide ${i + 1}`} aria-current={i === at}
              />
            ))}
          </div>
          <span className="gallery-count">{at + 1} / {slides.length}</span>
          <button type="button" className="gallery-arrow" onClick={() => go(at + 1)} disabled={at === slides.length - 1} aria-label="Next">→</button>
        </div>
      )}
    </div>
  );
}
