"use server";

import { z } from "zod";

import { notifyFeedback } from "@/lib/email";
import { isBot } from "@/lib/forms";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { FEEDBACK_KINDS, KIND_LABEL, feedbackSubject } from "@/lib/feedback";
import type { FormState } from "@/lib/actions";

/* ============================================================
   Bug reports and feature requests.

   The one public form with no database row behind it. Everywhere
   else the row is the record and the email is a notification, so a
   mail failure is survivable; here the email is the only copy, so a
   failed send has to be reported rather than swallowed. Saying
   "thanks" for something that went nowhere is worse than an error.
   ============================================================ */

const trimmed = z.string().trim();

const schema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: trimmed
    .min(4, "A sentence or two is plenty.")
    .max(4000, "That's longer than we can take — trim it a little."),
  /* Optional: reporting a bug shouldn't require identifying yourself.
     Empty becomes undefined before the email rule runs, or "" would be
     held to the format and fail. */
  email: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      trimmed.email("That email doesn't look right.").optional(),
    )
    .transform((v) => (v ?? null) as string | null),
});

export async function submitFeedback(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  /* A bot gets the same thank-you a person does. A 400 would only tell
     it which field gave it away. */
  if (isBot(formData)) return { ok: true };

  const limit = rateLimit(`feedback:${await clientIp()}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      formError: "That's a few in a row — give it an hour, or email info@4irecords.com.",
    };
  }

  const parsed = schema.safeParse({
    kind: formData.get("kind"),
    message: formData.get("message"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return {
      errors,
      values: {
        kind: String(formData.get("kind") ?? "bug"),
        message: String(formData.get("message") ?? ""),
        email: String(formData.get("email") ?? ""),
      },
    };
  }

  const { kind, message, email } = parsed.data;

  const sent = await notifyFeedback({
    kindLabel: KIND_LABEL[kind],
    subject: feedbackSubject(kind, "4i Records"),
    message,
    email,
  });

  if (!sent.ok) {
    return {
      formError:
        "Couldn't send that — try again, or email info@4irecords.com directly.",
      values: { kind, message, email: email ?? "" },
    };
  }

  return { ok: true };
}
