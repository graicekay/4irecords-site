"use client";

import { useState } from "react";
import { PLANNED_TOOLS } from "@/lib/planned-tools";

/* The shot visualizer on /links, folded under a 4i Productions button:
   open, it shows the tool's still and its line, linking to the tool on
   4iproductions.com (a cross-site link, tagged by lib/analytics). */
export function LinksShotVisualizer() {
  const [open, setOpen] = useState(false);
  const sv = PLANNED_TOOLS[0];
  if (!sv?.href) return null;
  return (
    <section className="links-section">
      <button type="button" className="btn links-btn" aria-expanded={open} aria-controls="links-sv" onClick={() => setOpen(!open)}>
        <span><span className="no-caps">4i</span> Productions: Shot Visualizer (free tool)</span>
        <span aria-hidden="true" className="links-caret">{open ? "−" : "+"}</span>
      </button>
      <div id="links-sv" className="links-fold" data-open={open} inert={!open}>
        <div className="links-fold-inner">
          <a href={sv.href} className="links-card" data-link-id="shot_visualizer" data-placement="links">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {sv.banner && <img src={sv.banner} alt="" className="links-card-img" loading="lazy" />}
            <span className="links-card-blurb">{sv.blurb}</span>
            <span className="links-card-label">Open the Shot Visualizer ↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
