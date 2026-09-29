"use server";

import { z } from "zod";
import { upsertContact } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isBot } from "@/lib/forms";
import type { SignupResult } from "@/shot-visualizer/Visualizer";

/* The shot list's download gate, 4i Records' copy. The file is built in
   the browser, so nothing is emailed; the address joins the contacts list
   like any other resource, and coming in on 4i Records marks it as an
   artist (4i Productions keeps the filmmakers). upsertContact also
   forwards it to invoiCE's audience. */

const Email = z.string().trim().toLowerCase().email().max(320);

export async function shotListSignup(form: FormData): Promise<SignupResult> {
  if (isBot(form)) return { ok: true };

  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, error: "That email doesn't look right." };

  const ip = await clientIp();
  if (!rateLimit(`resource:${ip}`, { max: 10, windowMs: 10 * 60 * 1000 }).allowed) {
    return { ok: false, error: "That's a lot of tries. Give it a few minutes." };
  }

  try {
    await upsertContact({
      email: parsed.data,
      tags: ["resource-downloader", "resource:shot-visualizer"],
      source: "/resources/shot-visualizer",
    });
  } catch (e) {
    console.error("[shot-visualizer] contact upsert failed:", e);
    return { ok: false, error: "Something broke on our end. Try again, or email info@4irecords.com." };
  }
  return { ok: true };
}
