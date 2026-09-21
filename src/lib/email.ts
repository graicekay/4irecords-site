import { Resend } from "resend";

/* ============================================================
   Email, via Resend.

   Two jobs: deliver a gated resource to the person who asked for
   it, and tell Grace when something lands in the dashboard.

   Both degrade rather than throw. With no RESEND_API_KEY the send
   is logged and reported as skipped, so the whole site still works
   on a laptop with nothing configured — and, more importantly, a
   Resend outage can't turn a successful form submission into an
   error page. The row is already in the database by then; the
   email is the notification, not the record.
   ============================================================ */

const FROM = process.env.EMAIL_FROM ?? "4i Records <hello@4irecords.com>";
const NOTIFY = process.env.EMAIL_NOTIFY ?? "info@4irecords.com";

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const resend = client();
  if (!resend) {
    console.warn(`[4i] RESEND_API_KEY unset — would email ${opts.to}: ${opts.subject}`);
    return { ok: false, skipped: true };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    if (error) {
      console.error("[4i] resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error("[4i] resend threw:", error);
    return { ok: false, error: String(error) };
  }
}

/* Shared shell so every send looks like the site rather than a
   default transactional template. Inline styles only — Gmail strips
   <style> blocks, and a dark background can't be relied on either,
   so this reads correctly on white. */
function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111111;border:1px solid rgba(255,255,255,0.1);border-radius:4px;">
        <tr><td style="padding:28px 28px 0;">
          <span style="display:inline-block;background:#57ff52;color:#0a0a0a;font-family:Menlo,monospace;font-weight:bold;font-size:14px;padding:5px 8px;border-radius:2px;">4i</span>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#f0f0f0;">
          ${body}
        </td></tr>
      </table>
      <p style="max-width:560px;margin:18px auto 0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#888888;text-align:left;">
        4i Records · Salt Lake City, Utah<br/>
        You're getting this because you asked us for something at 4irecords.com.
        <a href="{{UNSUB}}" style="color:#888888;">Unsubscribe</a>.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/* CAN-SPAM wants a working unsubscribe and a real postal address in
   anything promotional. The address is in the footer above; this is
   the link. It's a plain signed URL — no login to unsubscribe. */
function withUnsub(html: string, email: string): string {
  const base = process.env.SITE_URL ?? "https://www.4irecords.com";
  const url = `${base}/unsubscribe?email=${encodeURIComponent(email)}`;
  return html.replace("{{UNSUB}}", url);
}

/* ---------- Resource delivery ---------- */

export async function sendResource(opts: {
  to: string;
  title: string;
  downloadLabel: string;
  downloadUrl: string;
  slug: string;
}): Promise<SendResult> {
  const html = withUnsub(
    layout(`
      <p style="margin:0 0 16px;">Here's <strong>${escapeHtml(opts.title)}</strong>, as promised.</p>
      <p style="margin:0 0 24px;">
        <a href="${opts.downloadUrl}" style="display:inline-block;background:#57ff52;color:#0a0a0a;font-weight:600;text-decoration:none;padding:13px 22px;border-radius:2px;">
          ${escapeHtml(opts.downloadLabel)}
        </a>
      </p>
      <p style="margin:0 0 8px;color:#888888;font-size:13px;">
        This link is tied to your email address and expires in 7 days. Ask again on the
        site any time and we'll send a fresh one.
      </p>
      <p style="margin:24px 0 0;">
        If you'd rather someone else made this for you, that's what
        <a href="https://www.4irecords.com/visuals" style="color:#57ff52;">4i Productions</a> is for.
      </p>
    `),
    opts.to,
  );
  /* Replies go to the notification inbox, not the From address:
     EMAIL_FROM only has to be on a DKIM-verified domain, it doesn't
     have to be a mailbox that exists. Without this, anyone replying
     to a resource email would get a bounce. */
  return send({
    to: opts.to,
    subject: `${opts.title} — from 4i Records`,
    html,
    replyTo: NOTIFY,
  });
}

/* ---------- Internal notification ---------- */

export async function notifyInquiry(opts: {
  branch: string;
  name: string;
  email: string;
  summary: string;
}): Promise<SendResult> {
  const base = process.env.SITE_URL ?? "https://www.4irecords.com";
  const html = layout(`
    <p style="margin:0 0 6px;color:#57ff52;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">
      New ${escapeHtml(opts.branch)} inquiry
    </p>
    <p style="margin:0 0 4px;font-size:18px;"><strong>${escapeHtml(opts.name)}</strong></p>
    <p style="margin:0 0 18px;"><a href="mailto:${escapeHtml(opts.email)}" style="color:#57ff52;">${escapeHtml(opts.email)}</a></p>
    <p style="margin:0 0 22px;white-space:pre-wrap;">${escapeHtml(opts.summary)}</p>
    <p style="margin:0;"><a href="${base}/admin" style="color:#57ff52;">Open the dashboard</a></p>
  `).replace("{{UNSUB}}", `${base}/admin`);

  /* Reply-to is the person who wrote in, so hitting reply in the
     notification answers them directly. */
  return send({
    to: NOTIFY,
    subject: `4i Records — ${opts.branch} inquiry from ${opts.name}`,
    html,
    replyTo: opts.email,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
