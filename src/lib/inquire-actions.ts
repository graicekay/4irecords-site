"use server";

import { z } from "zod";
import { createInquiry, upsertContact, type InquiryKind } from "@/lib/db";
import { notifyInquiry } from "@/lib/email";
import { forwardToInvoice } from "@/lib/invoice-forward";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isBot } from "@/lib/forms";
import type { FormState } from "@/lib/actions";

/* ============================================================
   §3.6 — one form, branching on "What are you here for?".

   Every submission does three things: writes a row, tags the
   contact by branch (this form is the seed list for the
   marketplace), and emails Grace. The email is best-effort — the
   row is the record, so a mail failure never fails the submission.
   ============================================================ */

const trimmed = z.string().trim();
const opt = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed.max(max).optional(),
  ).transform((v) => (v ?? null) as string | null);

const BRANCHES = ["visuals", "artist", "creative", "updates"] as const;
export type Branch = (typeof BRANCHES)[number];

const base = {
  branch: z.enum(BRANCHES),
  email: trimmed.email("That email doesn't look right."),
};

/* Each branch asks only for what it needs. "Just keep me posted" is
   deliberately email-only — asking a name for a mailing list is the
   kind of friction §4 exists to prevent. */
const schemas = {
  visuals: z.object({ ...base, name: opt(120) }),
  updates: z.object({ ...base }),
  artist: z.object({
    ...base,
    name: trimmed.min(1, "Tell us your name.").max(120),
    links: trimmed.min(1, "Give us somewhere to hear you.").max(2000),
    message: trimmed.min(10, "A couple of sentences is plenty.").max(5000),
    role: opt(300),
  }),
  creative: z.object({
    ...base,
    name: trimmed.min(1, "Tell us your name.").max(120),
    role: trimmed.min(1, "What do you do?").max(120),
    portfolio: trimmed.min(1, "Somewhere we can see the work.").max(2000),
    availability: opt(300),
    message: opt(5000),
  }),
} as const;

const TAGS: Record<Branch, string[]> = {
  visuals: ["inquiry", "branch:visuals"],
  artist: ["inquiry", "branch:artist"],
  creative: ["inquiry", "branch:creative"],
  updates: ["branch:updates"],
};

const LABEL: Record<Branch, string> = {
  visuals: "visuals",
  artist: "artist",
  creative: "creative",
  updates: "keep-me-posted",
};

export async function submitBranchedInquiry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (isBot(formData)) return { ok: true };

  const branchRaw = String(formData.get("branch") ?? "");
  if (!BRANCHES.includes(branchRaw as Branch)) {
    return { formError: "Pick what you're here for." };
  }
  const branch = branchRaw as Branch;

  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && v && k !== "website") values[k] = v;
  }

  const parsed = schemas[branch].safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!(key in errors)) errors[key] = issue.message;
    }
    return { errors, values };
  }

  const ip = await clientIp();
  if (!rateLimit(`inquire:${ip}`, { max: 6, windowMs: 10 * 60 * 1000 }).allowed) {
    return { formError: "That's a lot of submissions. Try again in a few minutes.", values };
  }

  const d = parsed.data as Record<string, string | null | undefined>;
  const name = (d.name as string) ?? "(no name given)";
  const email = d.email as string;

  try {
    await upsertContact({
      email,
      tags: TAGS[branch],
      source: "/inquire",
    });

    /* "Keep me posted" is a list sign-up, not an inquiry — writing it
       into the inquiries queue would bury the ones that need a reply. */
    if (branch !== "updates") {
      await createInquiry({
        kind: branch as InquiryKind,
        name,
        email,
        links: (d.links as string) ?? null,
        message: (d.message as string) ?? null,
        role: (d.role as string) ?? null,
        portfolio: (d.portfolio as string) ?? null,
        availability: (d.availability as string) ?? null,
      });
    }
  } catch (error) {
    console.error("[4i] inquiry failed:", error);
    return {
      formError: "Something broke on our end. Try again, or email info@4irecords.com.",
      values,
    };
  }

  if (branch !== "updates") {
    const summary = [
      d.role && `Role: ${d.role}`,
      d.links && `Links: ${d.links}`,
      d.portfolio && `Portfolio: ${d.portfolio}`,
      d.availability && `Availability: ${d.availability}`,
      d.message && `\n${d.message}`,
    ].filter(Boolean).join("\n");

    /* Best-effort: the row is already saved, so a failed notification
       is logged and swallowed rather than shown to the visitor. */
    await notifyInquiry({ branch: LABEL[branch], name, email, summary })
      .catch((e) => console.error("[4i] notify failed:", e));

    // Into the one queue in invoiCE, alongside the local copy.
    forwardToInvoice({
      externalId: `${email}:${Date.now()}`,
      kind: branch,
      name,
      email,
      summary: (d.message as string) ?? "",
      details: {
        role: d.role ?? null,
        links: d.links ?? null,
        portfolio: d.portfolio ?? null,
        availability: d.availability ?? null,
      },
      receivedAt: new Date().toISOString(),
    });
  }

  return { ok: true };
}
