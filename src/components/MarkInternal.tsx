"use client";

import { useEffect } from "react";
import { setInternal } from "@/lib/analytics";

/* Rendered only inside the admin layout, which has already checked the
   session: anyone who sees /admin is Grace, so this browser's events are
   flagged internal from here on (tracking push T2). */
export default function MarkInternal() {
  useEffect(() => setInternal(true), []);
  return null;
}
