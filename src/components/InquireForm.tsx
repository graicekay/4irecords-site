"use client";

import FormShell, { Field } from "@/components/FormShell";
import { submitInquiry } from "@/lib/actions";

/* `kind` splits the two audiences the old site sent to two different
   Google Forms: artists who want to be on the label, and filmmakers,
   marketers and live performers who want to work with it. One form,
   one field, one queue in the dashboard. */
export default function InquireForm({
  defaultKind = "artist",
}: {
  defaultKind?: "artist" | "collaborator";
}) {
  return (
    <FormShell
      action={submitInquiry}
      submitLabel="Send it"
      successTitle="Got it."
      successBody="We read every one of these. Expect to hear back at the address you gave us — if it's been more than a week, nudge us at info@4irecords.com."
    >
      {(errors, values) => (
        <>
          <Field name="kind" label="What's this about?" errors={errors}>
            <select id="kind" name="kind" className="select" defaultValue={values.kind ?? defaultKind}>
              <option value="artist">I&apos;m an artist looking to work with 4i</option>
              <option value="collaborator">
                I&apos;m a filmmaker, marketer, or live performer
              </option>
            </select>
          </Field>

          <Field name="name" label="Name" errors={errors}>
            <input id="name" name="name" className="input" defaultValue={values.name ?? ""} required maxLength={120} />
          </Field>

          <Field name="email" label="Email" errors={errors}>
            <input id="email" name="email" type="email" className="input" defaultValue={values.email ?? ""} required />
          </Field>

          <Field name="location" label="Where you're based" errors={errors} hint="Optional. We're in Salt Lake, but we work remote.">
            <input id="location" name="location" className="input" defaultValue={values.location ?? ""} maxLength={120} />
          </Field>

          <Field
            name="links"
            label="Links"
            errors={errors}
            hint="Optional. Spotify, Bandcamp, SoundCloud, a reel, an Instagram — whatever shows us the work."
          >
            <textarea id="links" name="links" className="textarea" style={{ minHeight: 90 }}
              defaultValue={values.links ?? ""} maxLength={2000} />
          </Field>

          <Field
            name="message"
            label="Tell us about it"
            errors={errors}
            hint="What you're making, what you're after, and what you'd want from us."
          >
            <textarea id="message" name="message" className="textarea"
              defaultValue={values.message ?? ""} required maxLength={5000} />
          </Field>
        </>
      )}
    </FormShell>
  );
}
