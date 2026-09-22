/* ============================================================
   Safe-area diagrams (content spec §5).

   Three 9:16 frames showing where each platform's interface covers
   the picture. Inline SVG rather than images: they're a dozen
   rectangles, they stay sharp at any size, and they carry no
   request.

   Every inset is quoted against a 1080 × 1920 frame and scaled into
   the 108 × 192 viewBox by a factor of ten, so the numbers in the
   table below the diagrams and the shapes above them cannot drift
   apart.
   ============================================================ */

type Frame = {
  platform: string;
  top: number;
  bottom: number;
  sides: number;
  /** Action-button strip down the right, where one exists. */
  rail?: number;
  note: string;
};

const FRAMES: Frame[] = [
  {
    platform: "Instagram Reels",
    top: 108,
    bottom: 320,
    sides: 60,
    rail: 180,
    note: "Action buttons in the right ~180px",
  },
  {
    platform: "TikTok",
    top: 130,
    bottom: 250,
    sides: 60,
    rail: 180,
    note: "Action buttons in the right ~180px",
  },
  {
    platform: "YouTube Shorts",
    top: 240,
    bottom: 240,
    sides: 60,
    note: "Central 4:5 — no text in the bottom 10–15%",
  },
];

const S = 10; // 1080 × 1920 down to the 108 × 192 viewBox

export function SafeAreas() {
  return (
    <div className="szgrid">
      {FRAMES.map((f) => {
        const top = f.top / S;
        const bottom = f.bottom / S;
        const sides = f.sides / S;
        const rail = (f.rail ?? 0) / S;

        return (
          <figure key={f.platform}>
            <svg viewBox="0 0 108 192" role="img" aria-label={`${f.platform} safe area`}>
              <rect width="108" height="192" fill="#050505" />

              {/* Where the interface sits over the picture. */}
              <rect x="0" y="0" width="108" height={top} fill="#fff" opacity="0.13" />
              <rect x="0" y={192 - bottom} width="108" height={bottom} fill="#fff" opacity="0.13" />
              {rail > 0 && (
                <rect x={108 - rail} y={top} width={rail} height={192 - top - bottom}
                      fill="#fff" opacity="0.08" />
              )}

              {/* What's actually safe. */}
              <rect
                x={sides}
                y={top}
                width={108 - sides * 2 - rail}
                height={192 - top - bottom}
                fill="none"
                stroke="#57FF52"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
            </svg>
            <figcaption>
              <strong>{f.platform}</strong>
              <span>{f.note}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
