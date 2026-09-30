import type { Sticker } from "@/lib/stickers";

/* A purely decorative layer of blurred-to-sharp stickers behind a header.
   Sits under the copy (z-index 0) and ignores the pointer, so it can't
   steal a click. The float is CSS-only and stops for reduced motion. */
export function Stickers({ items }: { items: Sticker[] }) {
  return (
    <div className="stickers" aria-hidden="true">
      {items.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${s.src}-${i}`}
          src={s.src}
          alt=""
          className={`sticker sticker-${s.depth}${s.wide ? " sticker-wide" : ""}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.width}%`,
            ["--rot" as string]: `${s.rotate ?? 0}deg`,
            ["--delay" as string]: `${(i * -1.7).toFixed(1)}s`,
          }}
        />
      ))}
    </div>
  );
}
