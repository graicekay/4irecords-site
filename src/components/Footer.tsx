import Link from "next/link";
import { EVENTS_ENABLED, FANS_ENABLED } from "@/lib/flags";
import { SpinningRecord } from "@/components/SpinningRecord";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-inner">
        <div>
          <p className="tag display">
            <span className="four-n">4</span> Artists.{" "}
            <span className="four-n">4</span> Fans.{" "}
            <span className="four-n">4</span> Good.
          </p>
          <p className="muted small">Based in Salt Lake City, Utah.</p>
          {/* Whole disc here, not the half-moon — there is no horizon to
              rise over at the foot of the page. */}
          <SpinningRecord className="foot-record" />
        </div>

        <div className="cols">
          <div>
            <p className="head">Site</p>
            {EVENTS_ENABLED && <Link className="fl" href="/events">Events</Link>}
            <Link className="fl" href="/resources">Resources</Link>
            <Link className="fl" href="/visuals">Visuals</Link>
            <Link className="fl" href="/mission">Mission</Link>
            {FANS_ENABLED && <Link className="fl" href="/fans">4 Fans</Link>}
          </div>
          <div>
            <p className="head">Reach us</p>
            <a className="fl" href="mailto:info@4irecords.com">info@4irecords.com</a>
            <a
              className="fl"
              href="https://instagram.com/4irecords"
              target="_blank"
              rel="noreferrer noopener"
            >
              Instagram
            </a>
            <Link className="fl" href="/inquire">Inquire</Link>
            <Link className="fl" href="/feedback">Report a bug or request a feature</Link>
          </div>
        </div>
      </div>

      <div className="wrap rule">
        <p className="muted small">
          © {new Date().getFullYear()} 4i Records. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
