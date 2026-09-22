"use client";

import { useState } from "react";

/* ============================================================
   "Build your own budget" (content spec §4).

   Seven roles, three levels each, ranges per shoot day. Totals are
   kept as a lo–hi pair all the way through rather than collapsed to
   a midpoint — a single number would read as a quote, and the
   footer line says explicitly that it isn't one.

   The same numbers ship as 4i-budget-estimator.xlsx in the bundle,
   so if these change, change them there too.
   ============================================================ */

type Option = { label: string; lo: number; hi: number; note?: string };
type Row = { role: string; options: [Option, Option, Option] };

const ROWS: Row[] = [
  {
    role: "Director",
    options: [
      { label: "Self-direct, or a friend cheap/free", lo: 0, hi: 0 },
      { label: "Experienced independent filmmaker, discounted", lo: 200, hi: 500 },
      { label: "Hire a professional", lo: 500, hi: 1250 },
    ],
  },
  {
    role: "DP",
    options: [
      {
        label: "Friend films you, or tripod",
        lo: 0,
        hi: 0,
        note: "Pro tip: you can add natural-looking hand-held motion and zooms in the editing phase to reduce the bore of a tripod shot.",
      },
      { label: "DP taking it on as a portfolio builder", lo: 200, hi: 500 },
      { label: "Hire a professional", lo: 1000, hi: 1800 },
    ],
  },
  {
    role: "Gaff & grip crew",
    options: [
      { label: "Skip entirely", lo: 0, hi: 0 },
      { label: "Film students or enthusiastic techs", lo: 100, hi: 400 },
      {
        label: "Hire professionals",
        lo: 400,
        hi: 2000,
        note: "These people are often hired or recommended by your DP.",
      },
    ],
  },
  {
    role: "AD",
    options: [
      { label: "Do it yourself", lo: 0, hi: 0 },
      { label: "Someone at a discounted rate", lo: 100, hi: 300 },
      { label: "Hire a professional", lo: 300, hi: 800 },
    ],
  },
  {
    role: "Lighting equipment",
    options: [
      { label: "Natural light / what you have", lo: 0, hi: 0 },
      { label: "Cheap rental house or second-hand", lo: 50, hi: 250 },
      {
        label: "Professional lighting package",
        lo: 300,
        hi: 1200,
        note: "Usually specced by your DP or CLT.",
      },
    ],
  },
  {
    role: "Camera",
    options: [
      { label: "Phone or camera you own", lo: 0, hi: 0 },
      { label: "Library, student house, cheap rental", lo: 0, hi: 150 },
      {
        label: "Professional camera package",
        lo: 300,
        hi: 800,
        note: "Professional DPs often include this in their rate, or already own a package.",
      },
    ],
  },
  {
    role: "Editing",
    options: [
      { label: "Yourself, or a friend free/discounted", lo: 0, hi: 0 },
      {
        label: "4i Productions discounted artist rate",
        lo: 200,
        hi: 600,
        note: "We give artists discounted rates on their visuals because we love independent artists.",
      },
      {
        label: "Professional editor, years of experience",
        lo: 800,
        hi: 2500,
        note: "Also available through 4i Productions.",
      },
    ],
  },
];

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const range = (lo: number, hi: number) =>
  lo === 0 && hi === 0 ? "$0" : lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;

export function BudgetEstimator() {
  const [picks, setPicks] = useState<number[]>(() => ROWS.map(() => 0));

  const total = ROWS.reduce(
    (acc, row, i) => {
      const o = row.options[picks[i]!]!;
      return { lo: acc.lo + o.lo, hi: acc.hi + o.hi };
    },
    { lo: 0, hi: 0 },
  );

  return (
    <div className="estimator">
      {ROWS.map((row, i) => {
        const chosen = row.options[picks[i]!]!;
        return (
          <div className="estimator-row" key={row.role}>
            <label className="estimator-role" htmlFor={`est-${i}`}>
              {row.role}
            </label>
            <div>
              <select
                id={`est-${i}`}
                className="input estimator-select"
                value={picks[i]}
                onChange={(e) => {
                  const next = [...picks];
                  next[i] = Number(e.target.value);
                  setPicks(next);
                }}
              >
                {row.options.map((o, j) => (
                  <option key={o.label} value={j}>
                    {"ABC"[j]} — {o.label} ({range(o.lo, o.hi)})
                  </option>
                ))}
              </select>
              {chosen.note && <p className="estimator-note">{chosen.note}</p>}
            </div>
            <div className="estimator-cost">{range(chosen.lo, chosen.hi)}</div>
          </div>
        );
      })}

      <div className="estimator-total">
        <span>Estimated total</span>
        <strong>{range(total.lo, total.hi)}</strong>
      </div>

      <p className="estimator-foot">
        Just a fun tool — these are ballpark ranges per shoot day, not quotes.
      </p>
    </div>
  );
}
