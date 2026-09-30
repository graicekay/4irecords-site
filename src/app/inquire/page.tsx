import type { Metadata } from "next";
import BranchedInquireForm from "@/components/BranchedInquireForm";
import type { Branch } from "@/lib/inquire-actions";
import { VisualsSmoke } from "@/components/VisualsSmoke";

export const metadata: Metadata = {
  title: "Inquire",
  description:
    "Artists, creatives, and anyone who just wants to stay posted. One form, four ways in.",
};

const VALID: Branch[] = ["visuals", "artist", "creative", "updates"];

/* `?for=creative` pre-selects a branch — links elsewhere can point in
   this way so someone who clicked "the marketplace" doesn't have to
   answer a question they've effectively already answered (§3.5). */
export default async function Inquire({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: raw } = await searchParams;
  const preset = VALID.includes(raw as Branch) ? (raw as Branch) : undefined;

  return (
    <>
      <section className="wrap page-head has-smoke">
        {/* 4i Productions' green smoke, on its own (no video here). */}
        <VisualsSmoke video={false} />
        <p className="eyebrow">Get in touch</p>
        <h1 className="display">Inquire</h1>
        <p className="sub">
          Four ways in. Pick which one best describes you.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 48 }}>
        <div className="wrap narrow">
          <BranchedInquireForm defaultBranch={preset} />
          <p className="muted" style={{ fontSize: 13, marginTop: 34 }}>
            Prefer email? We&apos;re at{" "}
            <a href="mailto:info@4irecords.com" style={{ color: "var(--accent)" }}>
              info@4irecords.com
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
