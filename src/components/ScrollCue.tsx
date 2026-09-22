"use client";

import { useEffect, useState } from "react";

/**
 * The ↓ under the hero.
 *
 * It answers one question — is there more below? — and once you have
 * scrolled, you know. So it goes on the first scroll and does not come back,
 * even on the way up: a cue that reappears is telling you something you have
 * already worked out.
 */
export function ScrollCue() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // A few pixels of slack: phones report a non-zero scrollY on load from
    // address-bar chrome alone, and that is not the reader scrolling.
    const onScroll = () => {
      if (window.scrollY <= 8) return;
      setGone(true);
      window.removeEventListener("scroll", onScroll);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={gone ? "cue gone" : "cue"} aria-hidden="true">
      ↓
    </div>
  );
}
