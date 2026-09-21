import { z } from "zod";

/* ============================================================
   Shapes for the three public forms.

   Every one of these is parsed server-side in the action before
   anything reaches the database — the browser's own `required`
   and `type=email` are a convenience for the person filling the
   form in, never the check that counts.
   ============================================================ */

const trimmed = z.string().trim();

/* An optional field that an empty input satisfies.
   The empty string is turned into `undefined` BEFORE the inner
   schema runs — otherwise "" is a present value and gets held to
   the field's own format rule, so leaving the optional phone box
   blank fails with "that phone number doesn't look right". The
   parsed value comes out as null, which is what the columns take. */
const optional = <T extends z.ZodType<string>>(s: T) =>
  z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      s.optional(),
    )
    .transform((v) => (v ?? null) as string | null);

export const inquirySchema = z.object({
  kind: z.enum(["artist", "collaborator"]),
  name: trimmed.min(1, "Tell us your name.").max(120),
  email: trimmed.email("That email doesn't look right."),
  location: optional(trimmed.max(120)),
  links: optional(trimmed.max(2000)),
  message: trimmed.min(10, "Give us a couple of sentences to go on.").max(5000),
  /* Honeypot. Real people never see this field, so anything in it
     is a bot — we accept the submission and drop it silently, which
     is quieter than a 400 that tells the bot to try again. */
  website: z.string().max(0).optional().or(z.string().optional()),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const subscribeSchema = z
  .object({
    name: optional(trimmed.max(120)),
    email: optional(trimmed.email("That email doesn't look right.")),
    phone: optional(trimmed.regex(/^[0-9+().\-\s]{7,20}$/, "That phone number doesn't look right.")),
    area: optional(trimmed.max(120)),
    wantsEmail: z.coerce.boolean().default(false),
    wantsSms: z.coerce.boolean().default(false),
    website: z.string().optional(),
  })
  /* Each chosen channel needs the contact detail it runs on, and at
     least one channel has to be chosen — otherwise the row is a
     subscriber we have no way to reach. */
  .refine((v) => v.wantsEmail || v.wantsSms, {
    message: "Pick email, text, or both.",
    path: ["wantsEmail"],
  })
  .refine((v) => !v.wantsEmail || v.email, {
    message: "We need an email address to send email updates.",
    path: ["email"],
  })
  .refine((v) => !v.wantsSms || v.phone, {
    message: "We need a number to send texts.",
    path: ["phone"],
  });

export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const rsvpSchema = z.object({
  eventSlug: trimmed.min(1),
  name: trimmed.min(1, "Tell us your name.").max(120),
  email: trimmed.email("That email doesn't look right."),
  guests: z.coerce.number().int().min(1, "At least one.").max(10, "More than ten? Message us instead."),
  note: optional(trimmed.max(1000)),
  website: z.string().optional(),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;

/* Flattens a ZodError into { field: "first message" } for the forms,
   which only ever show one message per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/* Checkboxes arrive as "on" or absent, which z.coerce.boolean() would
   read as true for the literal string "false" too. Normalising here
   keeps that quirk out of the schema. */
export function checkbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}

export function isBot(formData: FormData): boolean {
  return String(formData.get("website") ?? "").length > 0;
}
