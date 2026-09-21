"use client";

import FormShell, { Field } from "@/components/FormShell";
import { submitRsvp } from "@/lib/actions";

/* Replaces the per-show RSVP Google Form. For a show whose address
   is held back until RSVP, the success copy is the promise that the
   address is coming — so it's passed in rather than hardcoded. */
export default function RsvpForm({
  eventSlug, title, addressWithheld,
}: {
  eventSlug: string;
  title: string;
  addressWithheld: boolean;
}) {
  return (
    <FormShell
      action={submitRsvp}
      submitLabel="RSVP"
      successTitle={`You're down for ${title}.`}
      successBody={
        addressWithheld
          ? "We'll email you the address the day before the show. Don't post it — that's the whole deal with these."
          : "See you there. We'll email you a reminder the day before."
      }
    >
      {(errors, values) => (
        <>
          <input type="hidden" name="eventSlug" value={eventSlug} />

          <Field name="name" label="Name" errors={errors}>
            <input id="name" name="name" className="input" defaultValue={values.name ?? ""} required maxLength={120} />
          </Field>

          <Field name="email" label="Email" errors={errors} hint={
            addressWithheld ? "This is where the address goes, so make sure it's right." : undefined
          }>
            <input id="email" name="email" type="email" className="input" defaultValue={values.email ?? ""} required />
          </Field>

          <Field name="guests" label="How many of you?" errors={errors}>
            <input
              id="guests" name="guests" type="number" className="input"
              defaultValue={values.guests ?? 1} min={1} max={10} required
            />
          </Field>

          <Field name="note" label="Anything else?" errors={errors} hint="Optional.">
            <textarea id="note" name="note" className="textarea" style={{ minHeight: 90 }}
              defaultValue={values.note ?? ""} maxLength={1000} />
          </Field>
        </>
      )}
    </FormShell>
  );
}
