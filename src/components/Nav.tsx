"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EVENTS_ENABLED, FANS_ENABLED } from "@/lib/flags";
import { FourIMark } from "@/components/FourIMark";

/* Nav styling lives in globals.css, not styled-jsx: styled-jsx only
   scopes plain DOM elements, so every rule targeting a <Link> would
   be silently dropped. Same reason the footer's styles are global.

   The same six destinations the Google Site had, in the same order.
   "4 Artists" and "4 Fans" keep their names but lose the spaces in
   their URLs — /artists and /fans. Old links are redirected in
   next.config.ts so anything already shared still lands. */
const LINKS = [
  { href: "/resources", label: "Resources" },
  { href: "/visuals", label: "Visuals" },
  { href: "/mission", label: "Mission" },
  ...(EVENTS_ENABLED ? [{ href: "/events", label: "Events" }] : []),
  ...(FANS_ENABLED ? [{ href: "/fans", label: "4 Fans" }] : []),
  { href: "/inquire", label: "Inquire" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /* Close the drawer on navigation — without this it stays open over
     the new page, because the layout never unmounts between routes. */
  useEffect(() => { setOpen(false); }, [pathname]);

  /* Lock the page behind the open drawer so the body doesn't scroll
     under it on iOS. */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="4i Records — home">
          <FourIMark className="mark" />
          <span className="wordmark">
            <span className="wordmark-4i">4i</span> Records
          </span>
        </Link>

        <nav className="links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "link is-current" : "link"}
              aria-current={pathname === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          className="burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={open ? "bar bar-1 is-open" : "bar bar-1"} />
          <span className={open ? "bar bar-2 is-open" : "bar bar-2"} />
        </button>
      </div>

      {open && (
        <nav className="drawer" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "drawer-link is-current" : "drawer-link"}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}

    </header>
  );
}
