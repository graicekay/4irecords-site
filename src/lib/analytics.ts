import posthog from "posthog-js";
import { SITE, crossSiteHref, isCrossSiteHost } from "@/lib/cross-site";

/* ============================================================
   Browser-side tracking helpers. PostHog itself is initialised in
   /instrumentation-client.ts; everything here is a no-op when the
   env vars are missing, matching how init behaves.
   ============================================================ */

export const ANALYTICS_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export type EventProps = Record<string, string | number | boolean | null>;

export function capture(event: string, properties?: EventProps, beacon = false): void {
  if (!ANALYTICS_ENABLED) return;
  posthog.capture(event, properties, beacon ? { transport: "sendBeacon" } : undefined);
}

/* T2. Marks this browser as Grace's: the person property is what cohort
   586923 matches on, the super property puts a flag on every event.
   `false` undoes both. */
export function setInternal(on: boolean): void {
  if (!ANALYTICS_ENABLED) return;
  if (on && posthog.get_property("is_internal") === true) return;
  posthog.setPersonProperties({ $internal_or_test_user: on });
  if (on) posthog.register({ is_internal: true });
  else posthog.unregister("is_internal");
}

/* ============================================================
   Link tracking, by delegation rather than a wrapper component, so
   the server components and MDX keep plain <a> tags. An anchor opts
   in with data attributes:

     data-link-id     code for outbound_link_clicked (T5)
     data-placement   where on the page it sits
     data-ref         `ref` for a cross-site hop (T4); defaults to
                      4irecords-<link id>
     data-event       a named event to fire on click instead, for
                      in-site CTAs (spotlight_cta_clicked)

   Every http(s) link off this host fires outbound_link_clicked, and
   every link to another 4i site gets its href rewritten by
   crossSiteHref, tagged or not.
   ============================================================ */

function anchorOf(event: Event): HTMLAnchorElement | null {
  const target = event.target as Element | null;
  return target?.closest?.("a[href]") ?? null;
}

function destinationOf(a: HTMLAnchorElement): URL | null {
  const raw = a.dataset.hrefOriginal ?? a.getAttribute("href");
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const slugOfId = (id: string) => id.replace(/_/g, "-");

/* Rewrites the href just before the browser follows it (pointerdown also
   covers middle-click and long-press "open in new tab"). Always rebuilt
   from the original, so the ids are never stale. */
function prepareCrossSite(a: HTMLAnchorElement): void {
  const url = destinationOf(a);
  if (!url || url.host === window.location.host || !isCrossSiteHost(url.host)) return;
  if (!a.dataset.hrefOriginal) a.dataset.hrefOriginal = a.getAttribute("href") ?? "";
  const ref = a.dataset.ref ?? `${SITE}-${slugOfId(a.dataset.linkId ?? "link")}`;
  a.href = crossSiteHref(a.dataset.hrefOriginal, { ref });
}

function onClick(event: MouseEvent): void {
  const a = anchorOf(event);
  if (!a) return;
  prepareCrossSite(a);

  const placement = a.dataset.placement ?? null;
  if (a.dataset.event) {
    capture(a.dataset.event, { placement }, true);
    return;
  }

  const url = destinationOf(a);
  if (!url || url.host === window.location.host) return;
  capture("outbound_link_clicked", {
    link_id: a.dataset.linkId ?? "other",
    link_label: (a.dataset.linkLabel ?? a.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
    destination_url: url.toString(),
    destination_host: url.host,
    placement,
    is_cross_site: isCrossSiteHost(url.host),
  }, true);
}

let installed = false;

export function installLinkTracking(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  /* Capture phase, so the href is rewritten before anything else sees it. */
  document.addEventListener("pointerdown", (e) => {
    const a = anchorOf(e);
    if (a) prepareCrossSite(a);
  }, true);
  document.addEventListener("click", onClick, true);
  /* Middle-click fires auxclick, not click. */
  document.addEventListener("auxclick", (e) => {
    if (e.button === 1) onClick(e);
  }, true);
}
