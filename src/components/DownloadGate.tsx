"use client";

import { useEffect, useState } from "react";
import FormShell from "@/components/FormShell";
import { announceUnlock } from "@/components/Locked";
import { requestResource } from "@/lib/gate-actions";

/* One field, one button (§3.3). No name, no "how did you hear about
   us", no account. The privacy line under it is required by §4 and
   sets the expectation before the click, not after. */
export default function DownloadGate({
  slug, label, payWhatYouWant = false,
}: {
  slug: string;
  label: string;
  /* The Gumroad-style "$ 0+" box. Off unless the resource asks for it
     and Stripe is configured. */
  payWhatYouWant?: boolean;
}) {
  /* Stripe sends donors back with ?thanks=1. Read on the client so the
     page itself stays static. */
  const [thanked, setThanked] = useState(false);
  useEffect(() => {
    setThanked(new URLSearchParams(window.location.search).get("thanks") === "1");
  }, []);

  if (thanked) {
    return (
      <div className="gate">
        <p className="eyebrow">Free download</p>
        <div className="notice" role="status" style={{ marginTop: 12 }}>
          {/* COPY: the thank-you after a donation (placeholder). */}
          <p style={{ margin: 0, fontWeight: 500, color: "var(--accent)" }}>Thank you.</p>
          <p style={{ margin: "8px 0 0" }}>
            The file is in your email. If it hasn&apos;t shown up, look in spam, then tell us at info@4irecords.com.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gate">
      <p className="eyebrow">Free download</p>
      <p className="gate-label">{label}</p>

      {/* One email opens every locked block on the page, not just the one
          they happened to scroll to (content spec §2). */}
      <FormShell
        action={requestResource}
        onSuccess={announceUnlock}
        analyticsEvent="resource_download_requested"
        analyticsProperties={{ resource_slug: slug }}
        submitLabel="Send it to me"
        successTitle="Check your email."
        successBody="The file is on its way. If it hasn't shown up in a couple of minutes, look in spam — then tell us at info@4irecords.com."
      >
        {(errors, values) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email" className="input"
                defaultValue={values.email ?? ""} required
                placeholder="you@example.com"
              />
              {errors.email && <p className="error" role="alert">{errors.email}</p>}
            </div>
            {payWhatYouWant && (
              <div className="field" style={{ marginBottom: 12 }}>
                <label className="label" htmlFor="amount">Name a fair price</label>
                <div className="price-input">
                  <span aria-hidden="true">$</span>
                  <input
                    id="amount" name="amount" type="text" inputMode="decimal"
                    className="input" placeholder="0+" autoComplete="off"
                    defaultValue={values.amount ?? ""}
                  />
                </div>
                {errors.amount && <p className="error" role="alert">{errors.amount}</p>}
              </div>
            )}
          </>
        )}
      </FormShell>

      <p className="gate-privacy">
        One email field. We&apos;ll send you the file and the occasional new
        resource. Unsubscribe anytime.
      </p>
    </div>
  );
}
