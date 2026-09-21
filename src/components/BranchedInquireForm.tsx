"use client";

import { useState } from "react";
import FormShell, { Field } from "@/components/FormShell";
import { submitBranchedInquiry, type Branch } from "@/lib/inquire-actions";
import { PRODUCTIONS_INTAKE_URL, PRODUCTIONS_LIVE } from "@/lib/links";

/* §3.6. The branch question is answered before any fields appear, so
   nobody reads a form that isn't theirs. */

const CHOICES: { value: Branch; label: string; hint: string }[] = [
  {
    value: "visuals",
    label: "I'm an artist looking for visuals",
    hint: "Music videos, performance content, short-form cutdowns.",
  },
  {
    value: "artist",
    label: "I'm an artist who wants to be considered by 4i",
    hint: "You're building something and want us in it.",
  },
  {
    value: "creative",
    label: "I'm a creative who wants on a team",
    hint: "Manager, editor, strategist, marketer, producer, stylist.",
  },
  {
    value: "updates",
    label: "Just keep me posted",
    hint: "One email field, nothing else.",
  },
];

export default function BranchedInquireForm({
  defaultBranch,
}: {
  defaultBranch?: Branch;
}) {
  const [branch, setBranch] = useState<Branch | null>(defaultBranch ?? null);

  if (!branch) {
    return (
      <div>
        <p className="label" style={{ marginBottom: 14 }}>What are you here for?</p>
        <div style={{ display: "grid", gap: 10 }}>
          {CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              className="branch-pick"
              onClick={() => setBranch(c.value)}
            >
              <span className="branch-label">{c.label}</span>
              <span className="branch-hint">{c.hint}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const choice = CHOICES.find((c) => c.value === branch)!;

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", gap: 14, marginBottom: 24, flexWrap: "wrap",
      }}>
        <p style={{ margin: 0, fontWeight: 500 }}>{choice.label}</p>
        <button
          type="button"
          className="linkish"
          onClick={() => setBranch(null)}
        >
          Change
        </button>
      </div>

      {/* The visuals branch is a hand-off, not an intake. 4i Productions
          already has an AI intake with a quote range shown before
          submit; rebuilding it here would be a worse copy of it. */}
      {branch === "visuals" && (
        <p className="notice" style={{ marginBottom: 24 }}>
          {PRODUCTIONS_LIVE
            ? "Visuals are quoted through 4i Productions, which shows you a price range before you submit. Leave your email here and we'll send you straight there."
            : "Visuals run through 4i Productions. That intake isn't live yet — leave your email and we'll come to you as soon as it is."}
        </p>
      )}

      <FormShell
        action={submitBranchedInquiry}
        submitLabel={branch === "updates" ? "Keep me posted" : "Send it"}
        successTitle={branch === "updates" ? "You're on the list." : "Got it."}
        successBody={
          branch === "updates"
            ? "We'll email you when there's something worth reading. Unsubscribe anytime."
            : "We read every one of these. Expect to hear back at the address you gave us — if it's been more than a week, nudge us at info@4irecords.com."
        }
      >
        {(errors, values) => (
          <>
            <input type="hidden" name="branch" value={branch} />

            {branch !== "updates" && (
              <Field name="name" label="Name" errors={errors}>
                <input
                  id="name" name="name" className="input" maxLength={120}
                  defaultValue={values.name ?? ""}
                  required={branch === "artist" || branch === "creative"}
                />
              </Field>
            )}

            <Field name="email" label="Email" errors={errors}>
              <input
                id="email" name="email" type="email" className="input" required
                defaultValue={values.email ?? ""}
              />
            </Field>

            {branch === "artist" && (
              <>
                <Field
                  name="links" label="Links" errors={errors}
                  hint="Spotify, Instagram, TikTok, Bandcamp — wherever the work lives."
                >
                  <textarea
                    id="links" name="links" className="textarea"
                    style={{ minHeight: 90 }} maxLength={2000} required
                    defaultValue={values.links ?? ""}
                  />
                </Field>
                <Field
                  name="message" label="What are you building?" errors={errors}
                  hint="And what do you need most right now?"
                >
                  <textarea
                    id="message" name="message" className="textarea"
                    maxLength={5000} required defaultValue={values.message ?? ""}
                  />
                </Field>
              </>
            )}

            {branch === "creative" && (
              <>
                <Field
                  name="role" label="What do you do?" errors={errors}
                  hint="Manager, editor, creative director, marketer, stylist…"
                >
                  <input
                    id="role" name="role" className="input" maxLength={120} required
                    defaultValue={values.role ?? ""}
                  />
                </Field>
                <Field name="portfolio" label="Portfolio or profile" errors={errors}>
                  <input
                    id="portfolio" name="portfolio" className="input"
                    maxLength={2000} required defaultValue={values.portfolio ?? ""}
                  />
                </Field>
                <Field
                  name="availability" label="Availability" errors={errors}
                  hint="Optional. Hours a week, or when you're free."
                >
                  <input
                    id="availability" name="availability" className="input"
                    maxLength={300} defaultValue={values.availability ?? ""}
                  />
                </Field>
                <Field
                  name="message" label="Anything else?" errors={errors} hint="Optional."
                >
                  <textarea
                    id="message" name="message" className="textarea"
                    style={{ minHeight: 90 }} maxLength={5000}
                    defaultValue={values.message ?? ""}
                  />
                </Field>
              </>
            )}

            <p className="gate-privacy" style={{ marginBottom: 20 }}>
              One email field is all we need. We&apos;ll only use it to reply and
              to send the occasional new resource. Unsubscribe anytime.
            </p>
          </>
        )}
      </FormShell>

      {branch === "visuals" && PRODUCTIONS_LIVE && (
        <p style={{ marginTop: 20, fontSize: 13 }} className="muted">
          In a hurry?{" "}
          <a href={PRODUCTIONS_INTAKE_URL} style={{ color: "var(--accent)" }}>
            Go straight to the 4i Productions intake
          </a>
          .
        </p>
      )}
    </div>
  );
}
