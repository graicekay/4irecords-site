"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE, adminMode, checkPassword, cookieOptions, issueSession,
} from "@/lib/auth";

/* Sign in / sign out.

   Throttling is in memory and per process: this is one password on one
   box, and a real limiter belongs with the move to Supabase, same as the
   note on the public form. It still turns an unattended guessing script
   into a slow one. */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) return false;
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}

/* Only ever redirect within this site — a `next` of https://elsewhere
   would otherwise make the login page an open redirect. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
}

export type SignInState = { error?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const mode = adminMode();
  if (mode.kind === "misconfigured") {
    return { error: "No ADMIN_PASSWORD is set on this deployment." };
  }

  const next = safeNext(String(formData.get("next") ?? ""));
  if (mode.kind === "open") redirect(next);

  const ip = await clientIp();
  if (tooManyAttempts(ip)) {
    return { error: "Too many attempts. Wait fifteen minutes." };
  }

  const supplied = String(formData.get("password") ?? "");
  if (!checkPassword(supplied, mode.password)) {
    recordFailure(ip);
    return { error: "That password is wrong." };
  }

  attempts.delete(ip);
  const session = issueSession(mode.password);
  (await cookies()).set(SESSION_COOKIE, session.value, cookieOptions(session.maxAge));
  redirect(next);
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
