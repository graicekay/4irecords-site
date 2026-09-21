/* ============================================================
   Feature flags.

   `EVENTS_ENABLED` hides everything to do with live shows: the
   /events route (which 404s when off), its nav and footer links,
   and the calls to action that point at it.

   It's off because live performance isn't the focus right now —
   not because the work was wrong. The events page, the RSVP form,
   the JSON file, and the `rsvps` table are all left intact, so
   turning this back to `true` restores the whole thing.
   ============================================================ */

export const EVENTS_ENABLED = false;

/* `FANS_ENABLED` hides the /fans page the same way. It existed to
   get people to shows and to collect a list to tell about shows, so
   it goes quiet alongside them. The subscribe form, the table, and
   the admin view of it all stay — but with this off there is no
   longer anywhere on the site to join the list. */
export const FANS_ENABLED = false;
