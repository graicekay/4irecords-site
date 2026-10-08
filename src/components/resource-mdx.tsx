import type { ReactNode } from "react";

/* ============================================================
   The components the resource pages are built from, per §1 of
   4i-resources-content-and-design-spec.md.

   Everything here is styled under `.res` in globals.css — these
   pages are deliberately a different world from the rest of the
   site, and nothing they use may leak into it.
   ============================================================ */

/** The in-article CTA: a subtle underlined mono link, never a filled button. */
export function CtaLink({
  href, children, placement = "resource_inline",
}: { href: string; children: ReactNode; placement?: string }) {
  const external = href.startsWith("http");
  /* Links to the 4i Productions intake are the "Start a project" lead:
     lib/analytics tracks them and adds the cross-site ids at click time. */
  const intake = /^https?:\/\/(www\.)?4iproductions\.com\/?(\?[^#]*)?#inquire$/.test(href);
  return (
    <a
      className="ctalink"
      href={href}
      data-link-id={intake ? "start_project" : undefined}
      data-placement={placement}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
    >
      <span className="ctalink-arrow" aria-hidden="true">→</span>
      {children}
    </a>
  );
}

/** The bordered closing block every resource ends on. */
export function EndCta({
  title,
  href,
  label = "Start a project",
  children,
}: {
  title: string;
  href: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <aside className="endcta">
      <h2>{title}</h2>
      <div className="endcta-body">{children}</div>
      <CtaLink href={href} placement="resource_end_cta">{label}</CtaLink>
    </aside>
  );
}

/* Pulls the plain text out of arbitrary MDX children, so a blockquote can
   tell whether it opens with "PRO TIP" without the markdown having to say
   so in a second place. */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

/**
 * Blockquotes carry two different things in these resources: pro tips, which
 * get the bordered box with a green label, and plain emphasis, which gets the
 * accent left border. Told apart by reading the text rather than by asking
 * the author to remember a component name.
 */
export function Quote({ children }: { children?: ReactNode }) {
  const isProTip = /^\s*PRO TIP/i.test(textOf(children));
  return <blockquote className={isProTip ? "protip" : "note"}>{children}</blockquote>;
}
