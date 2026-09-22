import type { Metadata } from "next";
import { doUnsubscribe } from "@/lib/gate-actions";
import { FourIText } from "@/components/FourIMark";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/* One click from the email footer, no login (§4). Unsubscribing on a
   GET is normally bad practice, but a mail client prefetching the
   link only ever removes someone who asked to be removed — and an
   unsubscribe that needs a second click is the thing regulators and
   spam filters actually punish. Re-subscribing is one form away. */
export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const done = email ? await doUnsubscribe(email) : { ok: false };

  return (
    <section className="wrap narrow" style={{ padding: "96px 24px 120px" }}>
      <p className="eyebrow"><FourIText /> Records</p>
      <h1 className="display" style={{ fontSize: 46, margin: "12px 0 24px" }}>
        {email && done.ok ? "You're off the list." : "Something's off."}
      </h1>
      {email && done.ok ? (
        <p className="muted">
          We won&apos;t email {email} again. You can still read everything on the
          site — nothing here was ever behind that list.
        </p>
      ) : (
        <p className="muted">
          We couldn&apos;t work out which address to remove. Email{" "}
          <a href="mailto:info@4irecords.com" style={{ color: "var(--accent)" }}>
            info@4irecords.com
          </a>{" "}
          and we&apos;ll take care of it by hand.
        </p>
      )}
    </section>
  );
}
