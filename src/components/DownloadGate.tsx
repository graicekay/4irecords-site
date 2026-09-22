"use client";

import FormShell from "@/components/FormShell";
import { announceUnlock } from "@/components/Locked";
import { requestResource } from "@/lib/gate-actions";

/* One field, one button (§3.3). No name, no "how did you hear about
   us", no account. The privacy line under it is required by §4 and
   sets the expectation before the click, not after. */
export default function DownloadGate({
  slug, label,
}: {
  slug: string;
  label: string;
}) {
  return (
    <div className="gate">
      <p className="eyebrow">Free download</p>
      <p className="gate-label">{label}</p>

      {/* One email opens every locked block on the page, not just the one
          they happened to scroll to (content spec §2). */}
      <FormShell
        action={requestResource}
        onSuccess={announceUnlock}
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
