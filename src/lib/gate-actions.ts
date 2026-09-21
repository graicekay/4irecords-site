"use server";

import { z } from "zod";
import { recordDownload, upsertContact, unsubscribeContact } from "@/lib/db";
import { sendResource } from "@/lib/email";
import { makeToken } from "@/lib/download-token";
import { resourceBySlug } from "@/lib/resources";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isBot } from "@/lib/forms";
import type { FormState } from "@/lib/actions";

/* ============================================================
   The resource gate (§3.3, §4).

   One field. The file is delivered by email rather than streamed
   to the browser, which is what verifies the address and creates
   the first touch.

   A duplicate email is explicitly not an error (§6): it re-sends
   the file with a fresh link, because "you already downloaded
   this" is a worse experience than just sending it again.
   ============================================================ */

const schema = z.object({
  slug: z.string().trim().min(1),
  email: z.string().trim().email("That email doesn't look right."),
});

const BASE = process.env.SITE_URL ?? "https://www.4irecords.com";

export async function requestResource(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (isBot(formData)) return { ok: true };

  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { errors: { email: parsed.error.issues[0]?.message ?? "Check that address." } };
  }

  const { slug, email } = parsed.data;

  /* Keyed on IP rather than email: limiting by address would let
     someone lock a stranger out of their own download. */
  const ip = await clientIp();
  const limit = rateLimit(`resource:${ip}`, { max: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return {
      formError: "That's a lot of requests. Give it a few minutes and try again.",
      values: { email },
    };
  }

  const resource = resourceBySlug(slug);
  if (!resource?.downloadFile) {
    return { formError: "That resource doesn't have a download.", values: { email } };
  }

  /* The contact is saved before the send is attempted. If Resend is
     down, we've still captured the address and can deliver later —
     losing the lead to a transient mail failure would be the worse
     outcome of the two. */
  try {
    await upsertContact({
      email,
      tags: ["resource-downloader", `resource:${slug}`],
      source: `/resources/${slug}`,
    });
  } catch (error) {
    console.error("[4i] contact upsert failed:", error);
    return {
      formError: "Something broke on our end. Try again, or email info@4irecords.com.",
      values: { email },
    };
  }

  const url = `${BASE}/api/download/${slug}?t=${makeToken(slug, email)}`;
  const sent = await sendResource({
    to: email,
    title: resource.title,
    downloadLabel: resource.downloadLabel || "Download the file",
    downloadUrl: url,
    slug,
  });

  await recordDownload({ email, slug, delivered: sent.ok }).catch((e) =>
    console.error("[4i] download record failed:", e),
  );

  /* A skipped send means no API key is configured — a deployment
     problem, not the visitor's. Say so plainly rather than claiming
     an email is on its way that will never arrive. */
  if (!sent.ok) {
    return {
      formError: sent.skipped
        ? "Email isn't switched on yet, so we couldn't send the file. We've got your address — email info@4irecords.com and we'll send it over."
        : "We saved your address but couldn't send the email. Try again shortly, or email info@4irecords.com.",
      values: { email },
    };
  }

  return { ok: true };
}

/* Unsubscribe, reachable from the footer of every send. No login —
   asking someone to authenticate to leave a list is hostile, and
   CAN-SPAM expects a working one-click path. */
export async function doUnsubscribe(email: string): Promise<{ ok: boolean }> {
  try {
    await unsubscribeContact(email);
    return { ok: true };
  } catch (error) {
    console.error("[4i] unsubscribe failed:", error);
    return { ok: false };
  }
}
