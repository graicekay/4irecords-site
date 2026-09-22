import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The link preview card — what a shared URL becomes in Instagram, iMessage,
 * WhatsApp, Slack and everywhere else.
 *
 * Generated rather than a static file so it reads the same lockup the site
 * does: change the logo, the card follows. No web font is loaded — a
 * build-time font fetch can fail and take the card down with it, and the card
 * is the lockup plus one short line.
 */

export const alt = "4i Records — 4 Artists. 4 Fans. 4 Good.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const lockup = readFileSync(
    join(process.cwd(), "public", "4i-records-lockup.svg"),
    "utf8",
  );
  const src = `data:image/svg+xml;base64,${Buffer.from(lockup).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 46,
          background: "#0A0A0A",
          backgroundImage:
            "radial-gradient(1000px 500px at 50% 42%, rgba(87,255,82,0.16), rgba(10,10,10,0) 70%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={720} alt="" />
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 12,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.62)",
          }}
        >
          4 Artists. 4 Fans. 4 Good.
        </div>
      </div>
    ),
    size,
  );
}
