"use server";

import { createInquiry, createRsvp, upsertSubscriber } from "@/lib/db";
import {
  checkbox, fieldErrors, inquirySchema, isBot, rsvpSchema, subscribeSchema,
} from "@/lib/forms";

/* ============================================================
   The three public form actions.

   All three share one result shape so `FormShell` can render any
   of them: `ok` flips the form to its thank-you state, `errors`
   is keyed by field name, and `formError` is for the failures
   that aren't any one field's fault.
   ============================================================ */

export type FormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  formError?: string;
  /* What the person typed, echoed back.

     React 19 resets a <form action={...}> once the action resolves,
     so without this a validation error empties every field — losing a
     long inquiry message to a mistyped email address. The forms feed
     these back as defaultValue, so a rejected submission comes back
     with the answers still in it. Only ever populated on a failure;
     a success swaps the form out for the thank-you note. */
  values?: Record<string, string>;
};

/* Pulls the submitted fields back out of FormData for that echo.
   The honeypot is never echoed — it should stay empty. */
function echo(formData: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

/* A dropped database write shouldn't show a stack trace to a
   stranger, but silence would be worse — they'd assume it sent.
   Log the real error, show a way to reach us that doesn't depend
   on the thing that just broke. */
function failed(where: string, error: unknown, values: Record<string, string>): FormState {
  console.error(`[4i] ${where} failed:`, error);
  return {
    formError: "Something broke on our end. Try again, or email info@4irecords.com.",
    values,
  };
}

export async function submitInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isBot(formData)) return { ok: true };

  const sent = echo(formData, ["kind", "name", "email", "location", "links", "message"]);

  const parsed = inquirySchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    email: formData.get("email"),
    location: formData.get("location"),
    links: formData.get("links"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: sent };

  try {
    await createInquiry({
      kind: parsed.data.kind,
      name: parsed.data.name,
      email: parsed.data.email,
      location: parsed.data.location,
      links: parsed.data.links,
      message: parsed.data.message,
    });
    return { ok: true };
  } catch (error) {
    return failed("inquiry", error, sent);
  }
}

export async function submitSubscribe(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isBot(formData)) return { ok: true };

  const sent = echo(formData, ["name", "email", "phone", "area", "wantsEmail", "wantsSms"]);

  const parsed = subscribeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    area: formData.get("area"),
    wantsEmail: checkbox(formData.get("wantsEmail")),
    wantsSms: checkbox(formData.get("wantsSms")),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: sent };

  try {
    await upsertSubscriber({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      area: parsed.data.area,
      wantsEmail: parsed.data.wantsEmail,
      wantsSms: parsed.data.wantsSms,
    });
    return { ok: true };
  } catch (error) {
    return failed("subscribe", error, sent);
  }
}

export async function submitRsvp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isBot(formData)) return { ok: true };

  const sent = echo(formData, ["name", "email", "guests", "note"]);

  const parsed = rsvpSchema.safeParse({
    eventSlug: formData.get("eventSlug"),
    name: formData.get("name"),
    email: formData.get("email"),
    guests: formData.get("guests"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: sent };

  try {
    await createRsvp({
      eventSlug: parsed.data.eventSlug,
      name: parsed.data.name,
      email: parsed.data.email,
      guests: parsed.data.guests,
      note: parsed.data.note,
    });
    return { ok: true };
  } catch (error) {
    return failed("rsvp", error, sent);
  }
}
