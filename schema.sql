-- 4i Records — database schema (Neon Postgres)
--
-- Applied once by hand against the `4irecords-site` Neon project.
-- There's no migration runner: three tables that change rarely don't
-- justify one. If that stops being true, add one rather than editing
-- the database from a page.

CREATE TABLE IF NOT EXISTS inquiries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'new',   -- new | replied | archived
  kind         text NOT NULL,                 -- artist | collaborator
  name         text NOT NULL,
  email        text NOT NULL,
  location     text,
  links        text,
  message      text NOT NULL,
  admin_note   text
);
CREATE INDEX IF NOT EXISTS inquiries_created_idx ON inquiries (created_at DESC);

CREATE TABLE IF NOT EXISTS subscribers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  name         text,
  email        text,
  phone        text,
  area         text,
  wants_email  boolean NOT NULL DEFAULT false,
  wants_sms    boolean NOT NULL DEFAULT false,
  unsubscribed boolean NOT NULL DEFAULT false,
  CONSTRAINT subscribers_contact_present CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
-- Partial unique indexes, so a subscriber may give email, phone, or
-- both, and a repeat sign-up updates their row instead of failing.
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_key
  ON subscribers (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_phone_key
  ON subscribers (phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS rsvps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  event_slug   text NOT NULL,
  name         text NOT NULL,
  email        text NOT NULL,
  guests       integer NOT NULL DEFAULT 1,
  note         text
);
CREATE INDEX IF NOT EXISTS rsvps_event_idx ON rsvps (event_slug, created_at DESC);
-- One RSVP per person per show; a second one updates the first.
CREATE UNIQUE INDEX IF NOT EXISTS rsvps_event_email_key
  ON rsvps (event_slug, lower(email));
