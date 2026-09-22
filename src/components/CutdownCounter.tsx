"use client";

import { useState } from "react";

/* ============================================================
   "Count your own shoot" (content spec §5).

   Every deliverable carries a lo–hi range. Ticking recalculates the
   deliverable count and how many weeks of posting that is at three
   posts a week. All on by default, which lands on 29–55 and 10–18 —
   the figures the PDF and the spreadsheet both quote, so the three
   have to agree.
   ============================================================ */

type Item = { label: string; lo: number; hi: number };

const ITEMS: Item[] = [
  { label: "Final music video", lo: 1, hi: 1 },
  { label: "Long-form BTS", lo: 1, hi: 2 },
  { label: "Shorts lyric clips", lo: 3, hi: 5 },
  { label: "Shorts BTS cutdowns", lo: 2, hi: 4 },
  { label: "Shorts video excerpts", lo: 2, hi: 3 },
  { label: "IG teaser reels", lo: 1, hi: 2 },
  { label: "IG sound design shots", lo: 1, hi: 2 },
  { label: "IG lyric clips", lo: 5, hi: 10 },
  { label: "IG frame grab posts", lo: 1, hi: 2 },
  { label: "IG BTS carousels", lo: 1, hi: 3 },
  { label: "TikTok BTS & bloopers", lo: 5, hi: 10 },
  { label: "TikTok you talking", lo: 5, hi: 10 },
  { label: "Spotify Canvas", lo: 1, hi: 1 },
];

const POSTS_PER_WEEK = 3;

export function CutdownCounter() {
  const [on, setOn] = useState<boolean[]>(() => ITEMS.map(() => true));

  const total = ITEMS.reduce(
    (acc, item, i) =>
      on[i] ? { lo: acc.lo + item.lo, hi: acc.hi + item.hi } : acc,
    { lo: 0, hi: 0 },
  );

  const weeks = {
    lo: Math.round(total.lo / POSTS_PER_WEEK),
    hi: Math.round(total.hi / POSTS_PER_WEEK),
  };

  const span = (lo: number, hi: number) => (lo === hi ? `${lo}` : `${lo}–${hi}`);

  return (
    <div className="counter">
      <div className="counter-stats">
        <div>
          <strong>{span(total.lo, total.hi)}</strong>
          <span>deliverables</span>
        </div>
        <div>
          <strong>{span(weeks.lo, weeks.hi)}</strong>
          <span>weeks at {POSTS_PER_WEEK} posts/wk</span>
        </div>
      </div>

      <div className="counter-rows">
        {ITEMS.map((item, i) => (
          <label className="counter-row" key={item.label}>
            <input
              type="checkbox"
              checked={on[i]}
              onChange={() => {
                const next = [...on];
                next[i] = !next[i];
                setOn(next);
              }}
            />
            <span className="counter-label">{item.label}</span>
            <span className="counter-qty">{span(item.lo, item.hi)}</span>
          </label>
        ))}
      </div>

      <p className="estimator-foot">
        Just a fun tool — counts assume one shoot with someone capturing BTS on
        the day.
      </p>
    </div>
  );
}
