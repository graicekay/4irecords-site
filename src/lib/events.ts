import raw from "@/content/events.json";

/* ============================================================
   Events are a JSON file in the repo, not a database table.

   Grace edits `src/content/events.json` (or asks Claude to) and
   the change ships with the next deploy. That's deliberate: a
   handful of shows a month doesn't justify an events CMS, and a
   file in git has a history and a rollback for free.

   The address is deliberately not in this file for shows with
   `addressPolicy: "on-rsvp"` — underground shows don't put the
   house on the public internet. It goes out in the RSVP reply.
   ============================================================ */

export type AddressPolicy = "public" | "on-rsvp";

export type EventItem = {
  slug: string;
  title: string;
  date: string;            // ISO 8601 with offset
  doorsAt: string | null;
  city: string;
  venue: string;
  address?: string | null; // only ever set when addressPolicy is "public"
  addressPolicy: AddressPolicy;
  lineup: string[];
  cover: string | null;
  flyer: string | null;    // path under /public, or null for a placeholder plate
  rsvp: boolean;
  note: string | null;
};

const events = raw as EventItem[];

/* A show stays "upcoming" until the end of its calendar day, so a
   gig that started at 8pm doesn't vanish off the page while the
   crowd is still in the room. */
function endOfDay(iso: string): number {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function upcomingEvents(now: number = Date.now()): EventItem[] {
  return events
    .filter((e) => endOfDay(e.date) >= now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export function pastEvents(now: number = Date.now()): EventItem[] {
  return events
    .filter((e) => endOfDay(e.date) < now)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function eventBySlug(slug: string): EventItem | undefined {
  return events.find((e) => e.slug === slug);
}

/* Formatted on a fixed timezone so the server and the browser can't
   disagree and trip a hydration mismatch. 4i is a Salt Lake outfit;
   its shows are Mountain Time. */
const TZ = "America/Denver";

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: TZ,
  }).format(new Date(iso));
}

export function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: TZ,
  }).format(new Date(iso));
}
