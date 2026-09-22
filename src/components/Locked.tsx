"use client";

import { useEffect, useState } from "react";

/* ============================================================
   A gated block (content spec §2).

   The content is always in the DOM — blurred, inert, and
   unselectable, never absent. Two reasons that matters: the
   readable substance of a resource is never what the email buys,
   and a block that renders server-side stays indexable, which is
   the whole acquisition argument in §6 of the architecture spec.

   Anyone determined can read it out of the DOM. That is fine and
   deliberate: this is a fair trade offered politely, not a
   paywall, and building it as one would cost the SEO the page
   exists for.
   ============================================================ */

export const UNLOCK_EVENT = "4i:unlocked";
const KEY = "4i-resources-unlocked";

/** Fired by the gate on a successful submit. Opens every block on the page. */
export function announceUnlock() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* Private window, or storage blocked. The unlock still works for
       this view; it just won't survive a reload. */
  }
  window.dispatchEvent(new Event(UNLOCK_EVENT));
}

export function Locked({
  children,
  label = "Unlock this",
  note,
}: {
  children: React.ReactNode;
  label?: string;
  note?: string;
}) {
  /* Starts locked on the server and on first paint, then opens if this
     browser has already unlocked. Doing it the other way round would flash
     the content to everyone before hiding it. */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore — see above */
    }
    const onUnlock = () => setOpen(true);
    window.addEventListener(UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(UNLOCK_EVENT, onUnlock);
  }, []);

  return (
    <div className={open ? "locked open" : "locked"}>
      <div className="locked-body" aria-hidden={!open}>
        {children}
      </div>

      {!open && (
        <div className="lockface">
          <p className="eyebrow">{label}</p>
          <p className="lockface-note">
            {note ??
              "Enter your email in the box on this page and every locked section here opens — plus we'll send you the files to keep."}
          </p>
        </div>
      )}
    </div>
  );
}
