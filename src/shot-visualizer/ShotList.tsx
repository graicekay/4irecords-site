"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { COPY } from "./copy";
import { shotLabel } from "./shots";
import { downloadCsv, downloadPdf, type ShotEntry } from "./export";
import type { SignupResult } from "./Visualizer";
import s from "./visualizer.module.css";

type Props = {
  list: ShotEntry[];
  editing: string | null;
  setEditing: (id: string | null) => void;
  onChange: (next: ShotEntry[]) => void;
  onLoad: (e: ShotEntry) => void;
  unlocked: boolean;
  unlock: (form: FormData) => Promise<SignupResult>;
  brand: string;
};

export default function ShotList({ list, editing, setEditing, onChange, onLoad, unlocked, unlock, brand }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A light check so the buttons wake up as the address is typed; the
  // server action does the real validation.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const update = (id: string, patch: Partial<ShotEntry>) =>
    onChange(list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (id: string) => onChange(list.filter((e) => e.id !== id));

  const run = async (kind: "pdf" | "csv") => {
    posthog.capture("shot_visualizer_download", { kind, shots: list.length });
    if (kind === "pdf") await downloadPdf(list, brand);
    else downloadCsv(list);
  };

  const download = async (kind: "pdf" | "csv", form?: HTMLFormElement | null) => {
    if (unlocked) return run(kind);
    if (!form) return;
    setBusy(true);
    setError(null);
    const res = await unlock(new FormData(form));
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "That didn't go through. Try again.");
      return;
    }
    await run(kind);
  };

  const canDownload = list.length > 0 && (unlocked || (emailOk && !busy));

  return (
    <section className={s.list} aria-labelledby="sv-list">
      <div className={s.listHead}>
        <h2 id="sv-list" className={s.listTitle}>
          Shot list <span className={s.dim}>{list.length ? `· ${list.length}` : ""}</span>
        </h2>
      </div>

      {/* The email sits beside the buttons; both downloads stay off until an
          address is in. Each button runs its own download, so the form itself
          never submits (and no form action, which React 19 would reset). */}
      <form className={s.gate} onSubmit={(ev) => ev.preventDefault()}>
        {!unlocked && (
          <div className={s.gateText}>
            <h3 className={s.gateTitle}>{COPY.gateHeading}</h3>
            <p className={s.explain}>{COPY.gateBody}</p>
          </div>
        )}
        <div className={s.gateRow}>
          {!unlocked && (
            <>
              <input className={s.input} type="email" name="email" required autoComplete="email"
                placeholder="you@example.com" aria-label="Email" value={email}
                onChange={(ev) => setEmail(ev.target.value)} />
              {/* honeypot: people never see it, bots fill it */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className={s.hp} aria-hidden="true" />
            </>
          )}
          <button type="button" className={`${s.btn} ${s.btnOn}`} disabled={!canDownload}
            onClick={(ev) => void download("pdf", ev.currentTarget.form)}>
            {busy ? "Sending…" : "Download PDF"}
          </button>
          <button type="button" className={s.btn} disabled={!canDownload}
            onClick={(ev) => void download("csv", ev.currentTarget.form)}>
            Download CSV
          </button>
        </div>
        {error && <p className={s.error} role="alert">{error}</p>}
      </form>

      {list.length === 0 ? (
        <p className={s.explain}>{COPY.listEmpty}</p>
      ) : (
        <ol className={s.rows}>
          {list.map((e, i) => (
            <li key={e.id} className={s.row}>
              <span className={s.rowNum}>{i + 1}</span>
              <button type="button" className={s.rowThumb} onClick={() => onLoad(e)} title="Load this shot">
                {e.thumb ? <img src={e.thumb} alt="" /> : null}
              </button>
              <div className={s.rowBody}>
                <p className={s.rowSpec}>{shotLabel(e.shot)}</p>
                {editing === e.id ? (
                  <div className={s.rowFields}>
                    <input className={s.input} placeholder="Scene" value={e.scene}
                      onChange={(ev) => update(e.id, { scene: ev.target.value })} />
                    <textarea className={s.input} placeholder="Description" rows={2} value={e.description}
                      onChange={(ev) => update(e.id, { description: ev.target.value })} />
                    <textarea className={s.input} placeholder="Notes" rows={2} value={e.notes}
                      onChange={(ev) => update(e.id, { notes: ev.target.value })} />
                    <button type="button" className={s.btn} onClick={() => setEditing(null)}>Done</button>
                  </div>
                ) : (
                  <button type="button" className={s.rowText} onClick={() => setEditing(e.id)}>
                    {e.scene && <span className={s.dim}>Scene {e.scene} · </span>}
                    {e.description || <span className={s.dim}>Add a description</span>}
                    {e.notes && <span className={s.rowNotes}>{e.notes}</span>}
                  </button>
                )}
              </div>
              <div className={s.rowTools}>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down">↓</button>
                <button type="button" onClick={() => remove(e.id)} aria-label="Delete shot">✕</button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
