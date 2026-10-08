import posthog from "posthog-js";

/* ============================================================
   One identity across the three sites (tracking push T4).

   4irecords.com, 4iproductions.com and graicekay.com share one
   PostHog project but not one cookie, so a hop between them would
   otherwise start a stranger. Links between them carry the
   visitor's PostHog ids, the UTMs they originally landed with, and
   a `ref` naming the link; the receiving site's
   instrumentation-client bootstraps from them and strips them.

   The param names and the sessionStorage key are shared with the
   other two repos. Change them in all three or not at all.
   ============================================================ */

export const SITE = "4irecords";

export const CROSS_SITE_HOSTS = [
  "4irecords.com", "www.4irecords.com",
  "4iproductions.com", "www.4iproductions.com",
  "graicekay.com", "www.graicekay.com",
];

export const ENTRY_UTM_KEY = "4i_entry_utm";

/* Only consumed on arrival; never left in the address bar. */
export const HANDOFF_PARAMS = ["ph_did", "ph_sid", "ref"] as const;

export function isCrossSiteHost(host: string): boolean {
  return CROSS_SITE_HOSTS.includes(host.toLowerCase());
}

function utmOf(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key.startsWith("utm_") && !(key in out)) out[key] = value;
  }
  return out;
}

/* Once per tab session, on the first pageview: the UTMs this visit
   landed with, so a click three pages later can still forward them.
   Saved even when empty, so a later tagged page can't overwrite it. */
export function saveEntryUtm(search: string): void {
  try {
    if (sessionStorage.getItem(ENTRY_UTM_KEY) !== null) return;
    sessionStorage.setItem(ENTRY_UTM_KEY, JSON.stringify(utmOf(new URLSearchParams(search))));
  } catch {
    /* Private mode or blocked storage: links just go without UTMs. */
  }
}

export function readEntryUtm(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(ENTRY_UTM_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (e): e is [string, string] => e[0].startsWith("utm_") && typeof e[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

/**
 * The href for a link to another 4i site, built at click time so the ids
 * are the live ones. Params go before any `#hash` (URL does that).
 */
export function crossSiteHref(url: string, { ref }: { ref: string }): string {
  const target = new URL(url, window.location.href);
  try {
    const did = posthog.get_distinct_id?.();
    const sid = posthog.get_session_id?.();
    if (did) target.searchParams.set("ph_did", did);
    if (sid) target.searchParams.set("ph_sid", sid);
  } catch {
    /* PostHog not initialised (no env): still forward source and ref. */
  }
  for (const [key, value] of Object.entries(readEntryUtm())) {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  }
  target.searchParams.set("ref", ref);
  return target.toString();
}
