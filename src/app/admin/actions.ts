"use server";

import { revalidatePath } from "next/cache";
import { setInquiryStatus } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { InquiryStatus } from "@/lib/db";

/* The proxy redirects unauthenticated *page* requests, but a server
   action is its own POST endpoint and isn't covered by it — so this
   checks the session itself before touching anything. */
export async function markInquiry(id: string, status: InquiryStatus) {
  await requireAdmin();
  await setInquiryStatus(id, status);
  revalidatePath("/admin");
}
