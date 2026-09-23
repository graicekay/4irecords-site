"use client";

import { useTransition } from "react";
import posthog from "posthog-js";
import { markInquiry } from "./actions";
import type { Inquiry, InquiryStatus } from "@/lib/db";

const NEXT: Record<InquiryStatus, { to: InquiryStatus; label: string }[]> = {
  new:      [{ to: "replied", label: "Mark replied" }, { to: "archived", label: "Archive" }],
  replied:  [{ to: "archived", label: "Archive" }, { to: "new", label: "Back to new" }],
  archived: [{ to: "new", label: "Back to new" }],
};

const COLOR: Record<InquiryStatus, string> = {
  new: "var(--accent)",
  replied: "#ffd152",
  archived: "var(--text-sec)",
};

export default function InquiryRow({ inquiry }: { inquiry: Inquiry }) {
  const [pending, start] = useTransition();

  return (
    <article className="card" style={{ opacity: pending ? 0.5 : 1 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap", alignItems: "baseline",
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {inquiry.name}{" "}
            <span className="pill" style={{ marginLeft: 8 }}>
              {inquiry.kind === "artist" ? "Artist" : "Collaborator"}
            </span>
          </p>
          <a
            href={`mailto:${inquiry.email}`}
            className="muted"
            style={{ fontSize: 13 }}
          >
            {inquiry.email}
          </a>
          {inquiry.location && (
            <span className="muted" style={{ fontSize: 13 }}> · {inquiry.location}</span>
          )}
        </div>
        <p style={{
          margin: 0, fontSize: 11, letterSpacing: "0.16em",
          textTransform: "uppercase", color: COLOR[inquiry.status],
        }}>
          {inquiry.status}
        </p>
      </div>

      <p style={{ marginTop: 16, whiteSpace: "pre-wrap", fontSize: 14 }}>
        {inquiry.message}
      </p>

      {inquiry.links && (
        <p className="muted" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
          {inquiry.links}
        </p>
      )}

      <div style={{
        display: "flex", gap: 10, marginTop: 18,
        alignItems: "center", flexWrap: "wrap",
      }}>
        <span className="muted" style={{ fontSize: 12, marginRight: "auto" }}>
          {new Date(inquiry.created_at).toLocaleString("en-US", { timeZone: "America/Denver" })}
        </span>
        {NEXT[inquiry.status].map((a) => (
          <button
            key={a.to}
            className="btn"
            style={{ padding: "8px 14px", fontSize: 11 }}
            disabled={pending}
            onClick={() => {
              if (
                process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
                && process.env.NEXT_PUBLIC_POSTHOG_HOST
              ) {
                posthog.capture("inquiry_status_updated", {
                  previous_status: inquiry.status,
                  next_status: a.to,
                });
              }
              start(() => { void markInquiry(inquiry.id, a.to); });
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </article>
  );
}
