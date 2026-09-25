"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

/* ============================================================
   Every bullet in a resource is something to tick off, so every
   `ul` in the prose renders as a list of real checkboxes.

   Ticks are remembered in this browser, per page and per line of
   text, so a four-week plan keeps its progress between visits.
   Keyed by the text rather than the position: an edit that adds a
   line doesn't shift everyone's ticks onto the wrong items.
   ============================================================ */

const InChecklist = createContext(false);

export function Checklist(props: React.ComponentProps<"ul">) {
  return (
    <InChecklist.Provider value={true}>
      <ul {...props} className="checklist" />
    </InChecklist.Provider>
  );
}

/** An `li` of a checklist gets a box; one of an ordered list stays as it is. */
export function ChecklistItem({ children, ...props }: React.ComponentProps<"li">) {
  const inChecklist = useContext(InChecklist);
  if (!inChecklist) return <li {...props}>{children}</li>;
  return <Item {...props}>{children}</Item>;
}

function Item({ children, ...props }: React.ComponentProps<"li">) {
  const id = useId();
  const path = usePathname();
  // A nested list sits outside the label: labels can't nest, and ticking
  // the parent line shouldn't be what a click on a child line does.
  const all = Children.toArray(children);
  const nested = all.filter((c) => isValidElement(c) && (c.type === Checklist || c.type === "ol"));
  const text = all.filter((c) => !nested.includes(c));
  const key = `4i:check:${path}:${textOf(text).trim().slice(0, 200)}`;

  const [checked, setChecked] = useState(false);
  // After mount only, so the server render and the first client render agree.
  useEffect(() => {
    try {
      setChecked(window.localStorage.getItem(key) === "1");
    } catch {
      /* Private window or blocked storage: the box still works, it just forgets. */
    }
  }, [key]);

  function toggle(next: boolean) {
    setChecked(next);
    try {
      if (next) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    } catch {
      /* As above. */
    }
  }

  return (
    <li {...props} className={checked ? "is-checked" : undefined}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => toggle(e.target.checked)} />
      <label htmlFor={id}>{text}</label>
      <InChecklist.Provider value={false}>{nested}</InChecklist.Provider>
    </li>
  );
}

/** The plain text of some rendered markdown, for the storage key. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}
