"use client";

import { useState } from "react";

import FormShell, { Field } from "@/components/FormShell";
import { submitFeedback } from "@/lib/feedback-actions";
import { FEEDBACK_KINDS, KIND_LABEL, type FeedbackKind } from "@/lib/feedback";

/* The kind drives the wording of the box below it, so it is held in
   state rather than left to the uncontrolled form — asking "what
   happened" about a feature request reads as the wrong question. */
export default function FeedbackForm() {
  const [kind, setKind] = useState<FeedbackKind>("bug");

  return (
    <FormShell
      action={submitFeedback}
      submitLabel="Send it"
      successTitle="Sent — thank you."
      successBody="If you left an email we'll reply when there's something to say."
    >
      {(errors, values) => (
        <>
          <Field name="kind" label="What is it" errors={errors}>
            <select
              id="kind"
              name="kind"
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as FeedbackKind)}
            >
              {FEEDBACK_KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>

          <Field
            name="message"
            label={kind === "bug" ? "What happened" : "What would you like"}
            errors={errors}
          >
            <textarea
              id="message"
              name="message"
              className="input"
              rows={7}
              defaultValue={values.message ?? ""}
              maxLength={4000}
              placeholder={
                kind === "bug"
                  ? "What you were doing, what you expected, and what happened instead."
                  : ""
              }
            />
          </Field>

          <Field
            name="email"
            label="Email"
            errors={errors}
            hint="Optional — only so we can reply."
          >
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              defaultValue={values.email ?? ""}
            />
          </Field>
        </>
      )}
    </FormShell>
  );
}
