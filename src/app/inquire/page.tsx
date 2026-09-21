import type { Metadata } from "next";
import InquireForm from "@/components/InquireForm";

export const metadata: Metadata = {
  title: "Inquire",
  description:
    "Artists, filmmakers, marketers, and live performers — tell us what you're making.",
};

export default function Inquire() {
  return (
    <>
      <section className="wrap page-head">
        <p className="eyebrow">Get in touch</p>
        <h1 className="display">Inquire</h1>
        <p className="sub">
          Whether you make music or make things around it, this is the way in.
          Tell us what you&apos;re working on and what you&apos;d want from us.
        </p>
      </section>

      <section className="section" style={{ borderTop: 0, paddingTop: 48 }}>
        <div className="wrap narrow">
          <InquireForm />
          <p className="muted" style={{ fontSize: 13, marginTop: 30 }}>
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
