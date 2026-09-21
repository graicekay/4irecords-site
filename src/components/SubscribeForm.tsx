"use client";

import FormShell, { Field } from "@/components/FormShell";
import { submitSubscribe } from "@/lib/actions";

/* Replaces the "4i Text and Email Updates" Google Form. The two
   channel checkboxes are the whole point of the form, so they sit
   at the top and the contact fields follow from them. */
export default function SubscribeForm() {
  return (
    <FormShell
      action={submitSubscribe}
      submitLabel="Subscribe"
      successTitle="You're on the list."
      successBody="We'll only get in touch about shows. No more than a couple of messages a month, and you can tell us to stop any time."
    >
      {(errors, values) => (
        <>
          <div className="field">
            <span className="label">How should we reach you?</span>
            <label className="check" htmlFor="wantsEmail">
              <input id="wantsEmail" name="wantsEmail" type="checkbox"
                defaultChecked={values.wantsEmail ? values.wantsEmail === "on" : true} />
              <span>Email me about upcoming shows</span>
            </label>
            <label className="check" htmlFor="wantsSms">
              <input id="wantsSms" name="wantsSms" type="checkbox"
                defaultChecked={values.wantsSms === "on"} />
              <span>Text me about upcoming shows</span>
            </label>
            {errors.wantsEmail && <p className="error" role="alert">{errors.wantsEmail}</p>}
          </div>

          <Field name="name" label="Name" errors={errors} hint="Optional.">
            <input id="name" name="name" className="input" defaultValue={values.name ?? ""} maxLength={120} />
          </Field>

          <Field name="email" label="Email" errors={errors}>
            <input id="email" name="email" type="email" className="input" defaultValue={values.email ?? ""} />
          </Field>

          <Field name="phone" label="Phone" errors={errors} hint="Only needed if you want texts.">
            <input id="phone" name="phone" type="tel" className="input" defaultValue={values.phone ?? ""} />
          </Field>

          <Field
            name="area"
            label="Where you are"
            errors={errors}
            hint="Optional — so we can tell you about shows near you rather than all of them."
          >
            <input id="area" name="area" className="input" defaultValue={values.area ?? ""}
              maxLength={120} placeholder="Salt Lake City, UT" />
          </Field>
        </>
      )}
    </FormShell>
  );
}
