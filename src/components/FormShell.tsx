"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import posthog from "posthog-js";
import type { FormState } from "@/lib/actions";

/* ============================================================
   The chrome every public form shares: pending state on the
   button, a form-level error, and the swap to a thank-you note
   once the action comes back `ok`.

   The fields themselves are passed in as children so each form
   keeps its own markup — this owns submission, not layout.

   The children get both the errors and the values the person just
   submitted. React 19 resets the form once the action resolves, so
   fields that don't feed `values` back as their defaultValue come
   back blank after a validation error.
   ============================================================ */

export function Submit({ label }: { label: string }) {
  /* useFormStatus has to read from a form it isn't rendering, which
     means it must live in a child of <form> — hence its own tiny
     component rather than a hook call in FormShell. */
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-solid" disabled={pending}>
      {pending ? "Sending…" : label}
    </button>
  );
}

export function Field({
  name, label, errors, children, hint,
}: {
  name: string;
  label: string;
  errors?: Record<string, string>;
  children: React.ReactNode;
  hint?: string;
}) {
  const message = errors?.[name];
  return (
    <div className="field">
      <label className="label" htmlFor={name}>{label}</label>
      {children}
      {hint && !message && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</p>}
      {message && <p className="error" role="alert">{message}</p>}
    </div>
  );
}

/* Off-screen rather than display:none — a few bots skip hidden
   fields but fill visible ones, and this stays "visible". */
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{
      position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden",
    }}>
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export default function FormShell({
  action, submitLabel, successTitle, successBody, onSuccess, analyticsEvent, analyticsProperties, children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  successTitle: string;
  successBody: string;
  /* Runs once when the action comes back ok — the resource gate uses it to
     open the locked blocks on the page. In an effect rather than inline,
     so it fires after the render that flipped the state rather than
     during it. */
  onSuccess?: () => void;
  analyticsEvent?: string;
  analyticsProperties?: Record<string, string | boolean | number>;
  children: (
    errors: Record<string, string>,
    values: Record<string, string>,
  ) => React.ReactNode;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  if (state.ok) {
    return (
      <div className="notice" role="status">
        <p style={{ margin: 0, fontWeight: 500, color: "var(--accent)" }}>{successTitle}</p>
        <p style={{ margin: "8px 0 0" }}>{successBody}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      style={{ position: "relative" }}
      onSubmit={() => {
        if (
          analyticsEvent
          && process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
          && process.env.NEXT_PUBLIC_POSTHOG_HOST
        ) {
          posthog.capture(analyticsEvent, analyticsProperties);
        }
      }}
    >
      <Honeypot />
      {children(state.errors ?? {}, state.values ?? {})}
      {state.formError && (
        <p className="error" role="alert" style={{ marginBottom: 16 }}>{state.formError}</p>
      )}
      <Submit label={submitLabel} />
    </form>
  );
}
