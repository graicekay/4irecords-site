import posthog from "posthog-js";
import { HANDOFF_PARAMS, SITE, saveEntryUtm } from "@/lib/cross-site";
import { installLinkTracking, setInternal } from "@/lib/analytics";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

/* ============================================================
   Landing-URL cleanup, before init so the first $pageview sees the
   cleaned URL (tracking push T1, T2, T4). Runs before hydration, so
   the router starts from the cleaned URL too.

   - Instagram appends utm_source=ig&utm_medium=social&utm_content=
     link_in_bio even to links that are already tagged. For any utm_*
     key that appears twice, the first value (ours) wins.
   - ?internal=1 / ?internal=0 flags this browser as Grace's, then goes.
   - ph_did / ph_sid / ref arrive on links from the other 4i sites:
     they seed this visit's identity and session, then go. utm_* stay.
   ============================================================ */

const url = new URL(window.location.href);
let dirty = false;

const seen = new Set<string>();
const cleaned = new URLSearchParams();
for (const [key, value] of url.searchParams) {
  if (key.startsWith("utm_")) {
    if (seen.has(key)) { dirty = true; continue; }
    seen.add(key);
  }
  cleaned.append(key, value);
}

const take = (key: string) => {
  const value = cleaned.get(key);
  if (value !== null) { cleaned.delete(key); dirty = true; }
  return value;
};

const internal = take("internal");
const [handoffDid, handoffSid, entryRef] = HANDOFF_PARAMS.map(take);

if (dirty) {
  url.search = cleaned.toString();
  window.history.replaceState(window.history.state, "", url);
}

saveEntryUtm(url.search);

/* PostHog only honours a bootstrapped session id that is a UUID (v7);
   anything else is dropped rather than risk a broken session. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const distinctID = handoffDid && handoffDid.length <= 200 ? handoffDid : null;
const sessionID = handoffSid && UUID.test(handoffSid) ? handoffSid : null;

if (!projectToken || !host) {
  if (process.env.NODE_ENV !== "production") {
    const missingVariable = projectToken
      ? "NEXT_PUBLIC_POSTHOG_HOST"
      : "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    /* Only takes effect when this browser has no PostHog id yet. */
    ...(distinctID ? { bootstrap: { distinctID, ...(sessionID ? { sessionID } : {}) } } : {}),
    /* Runs before the first $pageview is sent, so it carries all of this. */
    loaded: (ph) => {
      /* T3: which site, on every event. */
      ph.register({ site: SITE });
      if (entryRef) ph.register_for_session({ entry_ref: entryRef });

      /* T2. Local dev is always Grace; /admin flags itself (MarkInternal). */
      const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      if (internal === "1" || (local && internal !== "0")) setInternal(true);
      else if (internal === "0") setInternal(false);
    },
  });
}

installLinkTracking();
