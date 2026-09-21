import { neon } from "@neondatabase/serverless";

/* ============================================================
   Every SQL statement in the project lives in this file.

   Postgres on Neon, over the serverless HTTP driver — Vercel's
   filesystem doesn't persist, so the SQLite approach used by
   4i Productions can't carry over here. Nothing outside this
   file writes SQL; keep it that way.

   Schema lives in `schema.sql` at the repo root and was applied
   once by hand. There's no migration runner: three tables that
   change rarely don't justify one. If that stops being true,
   add one rather than editing the database from a page.
   ============================================================ */

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return neon(url);
}

/* ---------- Types ---------- */

export type InquiryKind = "artist" | "collaborator";
export type InquiryStatus = "new" | "replied" | "archived";

export type Inquiry = {
  id: string;
  created_at: string;
  updated_at: string;
  status: InquiryStatus;
  kind: InquiryKind;
  name: string;
  email: string;
  location: string | null;
  links: string | null;
  message: string;
  admin_note: string | null;
};

export type Subscriber = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  area: string | null;
  wants_email: boolean;
  wants_sms: boolean;
  unsubscribed: boolean;
};

export type Rsvp = {
  id: string;
  created_at: string;
  event_slug: string;
  name: string;
  email: string;
  guests: number;
  note: string | null;
};

/* ---------- Inquiries ---------- */

export async function createInquiry(input: {
  kind: InquiryKind;
  name: string;
  email: string;
  location: string | null;
  links: string | null;
  message: string;
}): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO inquiries (kind, name, email, location, links, message)
    VALUES (${input.kind}, ${input.name}, ${input.email},
            ${input.location}, ${input.links}, ${input.message})
  `;
}

export async function listInquiries(): Promise<Inquiry[]> {
  const db = sql();
  return (await db`
    SELECT * FROM inquiries ORDER BY created_at DESC
  `) as Inquiry[];
}

export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  const db = sql();
  await db`
    UPDATE inquiries SET status = ${status}, updated_at = now() WHERE id = ${id}
  `;
}

/* ---------- Subscribers ----------

   A repeat sign-up updates the existing row rather than failing,
   so someone who subscribes twice just refreshes their prefs and
   sees the success message either way. Re-subscribing also clears
   `unsubscribed`, which is the only way back in without an admin.

   The two partial unique indexes mean a row can collide on either
   email or phone, so this runs as two conditional upserts rather
   than one ON CONFLICT — Postgres only takes a single conflict
   target per statement. */

export async function upsertSubscriber(input: {
  name: string | null;
  email: string | null;
  phone: string | null;
  area: string | null;
  wantsEmail: boolean;
  wantsSms: boolean;
}): Promise<void> {
  const db = sql();

  if (input.email) {
    await db`
      INSERT INTO subscribers (name, email, phone, area, wants_email, wants_sms)
      VALUES (${input.name}, ${input.email}, ${input.phone}, ${input.area},
              ${input.wantsEmail}, ${input.wantsSms})
      ON CONFLICT (lower(email)) WHERE email IS NOT NULL
      DO UPDATE SET
        name         = COALESCE(EXCLUDED.name, subscribers.name),
        phone        = COALESCE(EXCLUDED.phone, subscribers.phone),
        area         = COALESCE(EXCLUDED.area, subscribers.area),
        wants_email  = EXCLUDED.wants_email,
        wants_sms    = EXCLUDED.wants_sms,
        unsubscribed = false
    `;
    return;
  }

  await db`
    INSERT INTO subscribers (name, email, phone, area, wants_email, wants_sms)
    VALUES (${input.name}, ${input.email}, ${input.phone}, ${input.area},
            ${input.wantsEmail}, ${input.wantsSms})
    ON CONFLICT (phone) WHERE phone IS NOT NULL
    DO UPDATE SET
      name         = COALESCE(EXCLUDED.name, subscribers.name),
      area         = COALESCE(EXCLUDED.area, subscribers.area),
      wants_email  = EXCLUDED.wants_email,
      wants_sms    = EXCLUDED.wants_sms,
      unsubscribed = false
  `;
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const db = sql();
  return (await db`
    SELECT * FROM subscribers ORDER BY created_at DESC
  `) as Subscriber[];
}

/* ---------- RSVPs ---------- */

export async function createRsvp(input: {
  eventSlug: string;
  name: string;
  email: string;
  guests: number;
  note: string | null;
}): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO rsvps (event_slug, name, email, guests, note)
    VALUES (${input.eventSlug}, ${input.name}, ${input.email},
            ${input.guests}, ${input.note})
    ON CONFLICT (event_slug, lower(email))
    DO UPDATE SET
      name   = EXCLUDED.name,
      guests = EXCLUDED.guests,
      note   = COALESCE(EXCLUDED.note, rsvps.note)
  `;
}

export async function listRsvps(): Promise<Rsvp[]> {
  const db = sql();
  return (await db`
    SELECT * FROM rsvps ORDER BY created_at DESC
  `) as Rsvp[];
}

export async function rsvpCounts(): Promise<Record<string, number>> {
  const db = sql();
  const rows = (await db`
    SELECT event_slug, SUM(guests)::int AS heads FROM rsvps GROUP BY event_slug
  `) as { event_slug: string; heads: number }[];
  return Object.fromEntries(rows.map((r) => [r.event_slug, r.heads]));
}
