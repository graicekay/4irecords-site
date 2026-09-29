"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import Frame2D from "./Frame2D";
import TopDown from "./TopDown";
import ShotList from "./ShotList";
import { COPY } from "./copy";
import type { Clock } from "./clock";
import {
  DEFAULT_SHOT, SIZES, SIZE_ORDER, LENSES, F_STOPS, ANGLES, ANGLE_ORDER, MOVES, MOVE_ORDER,
  rig, framedDistance, type Shot,
} from "./shots";
import { depthOfField, formatMetres, hFov } from "./optics";
import type { ShotEntry } from "./export";
import { ACCENTS, DEFAULT_LOOK, PLACES, PLACE_ORDER, type Look } from "./scenes";
import s from "./visualizer.module.css";

/* The shot visualizer, shared by 4iproductions.com and 4irecords.com.
   The page passes in its brand name and its own email sign-up action;
   everything else is identical on both sites.

   Layout: controls on the left, the camera view on the right (sticky, so
   every change is visible without scrolling), the top-down plan under it,
   and the shot list below both. */

export type SignupResult = { ok: boolean; error?: string };

const LIST_KEY = "4i-shotlist-v1";
const UNLOCK_KEY = "4i-shotlist-unlocked";
const LOOK_KEY = "4i-shotlist-look";

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* full or blocked: the list still works for this visit */
  }
}

/** The camera view at 2× its pixels (640×360 PNG), for the shot list and the PDF. */
function snapshot(canvas: HTMLCanvasElement | null): string {
  if (!canvas) return "";
  const c = document.createElement("canvas");
  c.width = canvas.width * 2;
  c.height = canvas.height * 2;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

/** The aperture, drawn: blades round an opening sized for the f-number (f/1.4 widest). */
function Iris({ fStop }: { fStop: number }) {
  const r = 11 * (1.4 / fStop);
  return (
    <svg className={s.iris} viewBox="-16 -16 32 32" aria-hidden="true">
      <circle r="15" className={s.irisBody} />
      <circle r={Math.max(1.2, r)} className={s.irisHole} />
    </svg>
  );
}

function Chips<T extends string | number>({ label, options, value, onChange, show }: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  show: (v: T) => string;
}) {
  return (
    <div className={s.chips} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          role="radio"
          aria-checked={o === value}
          className={o === value ? `${s.chip} ${s.chipOn}` : s.chip}
          onClick={() => onChange(o)}
        >
          {show(o)}
        </button>
      ))}
    </div>
  );
}

export default function Visualizer({ brand, signup }: {
  brand: string;
  signup: (form: FormData) => Promise<SignupResult>;
}) {
  const [shot, setShot] = useState<Shot>(DEFAULT_SHOT);
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [playing, setPlaying] = useState(true);
  const clock = useRef<Clock>({ t0: 0, playing: true });
  const view = useRef<HTMLCanvasElement | null>(null);

  const [list, setList] = useState<ShotEntry[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    // Lists saved before "EWS" became "UWS" still load.
    const saved = readStore<ShotEntry[]>(LIST_KEY, []).map((e) =>
      (e.shot.size as string) === "ews" ? { ...e, shot: { ...e.shot, size: "uws" as const } } : e,
    );
    setList(saved);
    setUnlocked(readStore<boolean>(UNLOCK_KEY, false));
    const savedLook = readStore<Partial<Look>>(LOOK_KEY, {});
    setLook({
      place: savedLook.place && savedLook.place in PLACES ? savedLook.place : DEFAULT_LOOK.place,
      time: savedLook.time === "day" ? "day" : "night",
      accent: ACCENTS.some((a) => a.hex === savedLook.accent) ? savedLook.accent! : DEFAULT_LOOK.accent,
    });
    clock.current.t0 = performance.now();
  }, []);

  const saveList = useCallback((next: ShotEntry[]) => {
    setList(next);
    writeStore(LIST_KEY, next);
  }, []);

  const change = <K extends keyof Shot>(key: K, value: Shot[K]) => {
    setShot((prev) => {
      const next = { ...prev, [key]: value };
      // Holding the camera still: a lens change keeps the distance. Anything that
      // sets the framing (shot size, angle, switching the hold on) re-solves it.
      if (next.hold === "camera") {
        if (key === "lens") next.camDist = prev.camDist ?? framedDistance(prev.size, prev.lens);
        else if (key === "size" || key === "hold") next.camDist = framedDistance(next.size, next.lens);
      } else next.camDist = undefined;
      return next;
    });
    clock.current.t0 = performance.now(); // restart the move from its first frame
    posthog.capture("shot_visualizer_changed", { control: key, value });
  };

  const changeLook = <K extends keyof Look>(key: K, value: Look[K]) => {
    setLook((prev) => {
      const next = { ...prev, [key]: value };
      writeStore(LOOK_KEY, next);
      return next;
    });
    posthog.capture("shot_visualizer_changed", { control: key, value });
  };

  const togglePlay = () => {
    const next = !playing;
    setPlaying(next);
    clock.current = { t0: performance.now(), playing: next };
    if (next) posthog.capture("shot_visualizer_move_played", { move: shot.move });
  };

  const add = async () => {
    const entry: ShotEntry = {
      id: Math.random().toString(36).slice(2, 10),
      shot,
      set: { place: look.place, time: look.time },
      scene: list.at(-1)?.scene ?? "",
      description: "",
      notes: "",
      thumb: snapshot(view.current),
    };
    saveList([...list, entry]);
    setEditing(entry.id);
    posthog.capture("shot_visualizer_shot_added", { count: list.length + 1 });
  };

  const unlock = async (form: FormData): Promise<SignupResult> => {
    const res = await signup(form);
    if (res.ok) {
      setUnlocked(true);
      writeStore(UNLOCK_KEY, true);
      posthog.capture("shot_visualizer_signup");
    }
    return res;
  };

  const start = rig(shot, 0);
  const dof = depthOfField(shot.lens, shot.fStop, start.focus);

  return (
    <div className={s.root}>
      <header className={s.head}>
        <h1 className={s.title}>{COPY.title}</h1>
        <p className={s.intro}>{COPY.intro}</p>
      </header>

      <div className={s.workspace}>
        <div className={s.controls}>
          <section className={s.control}>
            <h2 className={s.controlLabel}>Shot size</h2>
            <Chips label="Shot size" options={SIZE_ORDER} value={shot.size}
              onChange={(v) => change("size", v)} show={(v) => SIZES[v].abbr} />
            <p className={s.explain}><strong>{SIZES[shot.size].name}.</strong> {COPY.sizes[shot.size]}</p>
          </section>

          <section className={s.control}>
            <h2 className={s.controlLabel}>{COPY.lensLabel}</h2>
            <Chips label="Lens (focal length)" options={LENSES} value={shot.lens}
              onChange={(v) => change("lens", v)} show={(v) => `${v}`} />
            <p className={s.explain}>
              <strong>{shot.lens}mm.</strong> {COPY.lenses[shot.lens]}{" "}
              <span className={s.dim}>{Math.round(hFov(shot.lens))}° view.</span>
            </p>
            <div className={s.hold}>
              <span className={s.holdLabel}>{COPY.holdLabel}</span>
              <Chips label={COPY.holdLabel} options={["frame", "camera"] as const} value={shot.hold ?? "frame"}
                onChange={(v) => change("hold", v)} show={(v) => COPY.holdChips[v]} />
            </div>
            <p className={s.explain}>{COPY.hold[shot.hold ?? "frame"]}</p>
            <details className={s.define}>
              <summary>{COPY.lensWhat}</summary>
              <p>{COPY.lensDefinition}</p>
            </details>
          </section>

          <section className={s.control}>
            <h2 className={s.controlLabel}>Aperture</h2>
            <Chips label="Aperture" options={F_STOPS} value={shot.fStop}
              onChange={(v) => change("fStop", v)} show={(v) => `f/${v}`} />
            <div className={s.apertureRow}>
              <Iris fStop={shot.fStop} />
              <p className={s.explain}>
                <strong>f/{shot.fStop}.</strong> {COPY.fStops[shot.fStop]}{" "}
                <span className={s.dim}>In focus: {formatMetres(dof.near)} – {formatMetres(dof.far)}.</span>
              </p>
            </div>
            <details className={s.define}>
              <summary>{COPY.apertureWhat}</summary>
              <p>{COPY.apertureDefinition}</p>
            </details>
          </section>

          <section className={s.control}>
            <label className={s.controlLabel} htmlFor="sv-angle">Angle</label>
            <select id="sv-angle" className={s.select} value={shot.angle}
              onChange={(e) => change("angle", e.target.value as Shot["angle"])}>
              {ANGLE_ORDER.map((a) => <option key={a} value={a}>{ANGLES[a].name}</option>)}
            </select>
            <p className={s.explain}>{COPY.angles[shot.angle]}</p>
          </section>

          <section className={s.control}>
            <label className={s.controlLabel} htmlFor="sv-move">Move</label>
            <select id="sv-move" className={s.select} value={shot.move}
              onChange={(e) => change("move", e.target.value as Shot["move"])}>
              {MOVE_ORDER.map((m) => <option key={m} value={m}>{MOVES[m].name}</option>)}
            </select>
            <p className={s.explain}>{COPY.moves[shot.move]}</p>
          </section>

          <button type="button" className={s.add} onClick={() => void add()}>+ Add to shot list</button>
        </div>

        <div className={s.stage}>
          <div className={s.frame}>
            <Frame2D shot={shot} look={look} clock={clock} playing={playing} canvasRef={view} />
            <div className={s.readout} aria-live="polite">
              <span className={s.readoutSize}>{SIZES[shot.size].abbr}</span>
              <span>{shot.lens}mm</span>
              <span>{Math.round(hFov(shot.lens))}°</span>
              <span>f/{shot.fStop}</span>
              <span>{formatMetres(start.focus)}</span>
            </div>
            {shot.move !== "static" && (
              <button type="button" className={s.play} onClick={togglePlay}
                aria-label={playing ? "Pause the move" : "Play the move"}>
                {playing ? "❚❚" : "▶"} {MOVES[shot.move].name}
              </button>
            )}
          </div>
          <div className={s.setBar}>
            <Chips label="Location" options={PLACE_ORDER} value={look.place}
              onChange={(v) => changeLook("place", v)} show={(v) => PLACES[v].name} />
            <Chips label="Time of day" options={["day", "night"] as const} value={look.time}
              onChange={(v) => changeLook("time", v)} show={(v) => (v === "day" ? "Day" : "Night")} />
            <div className={s.swatches} role="radiogroup" aria-label="Accent colour">
              {ACCENTS.map((a) => (
                <button key={a.hex} type="button" role="radio" aria-checked={look.accent === a.hex}
                  aria-label={a.name} title={a.name}
                  className={look.accent === a.hex ? `${s.swatch} ${s.swatchOn}` : s.swatch}
                  style={{ background: a.hex }} onClick={() => changeLook("accent", a.hex)} />
              ))}
            </div>
          </div>
          {start.floored && <p className={s.warn}>{COPY.floored}</p>}
          {shot.angle === "ots" && !start.partner && <p className={s.warn}>{COPY.otsTooTight}</p>}
          <TopDown shot={shot} place={look.place} clock={clock} playing={playing} />
        </div>
      </div>

      <ShotList
        list={list}
        editing={editing}
        setEditing={setEditing}
        onChange={saveList}
        onLoad={(e) => {
          setShot(e.shot);
          if (e.set) setLook((prev) => ({ ...prev, ...e.set }));
          clock.current.t0 = performance.now();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        unlocked={unlocked}
        unlock={unlock}
        brand={brand}
      />
    </div>
  );
}
