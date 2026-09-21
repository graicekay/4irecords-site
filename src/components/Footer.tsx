import Link from "next/link";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-inner">
        <div>
          <p className="tag display">4 Artists. 4 Fans. 4 Good.</p>
          <p className="muted small">
            Based in Salt Lake City, Utah. Open to remote collaboration.
          </p>
        </div>

        <div className="cols">
          <div>
            <p className="head">Site</p>
            <Link className="fl" href="/events">Events</Link>
            <Link className="fl" href="/mission">Mission</Link>
            <Link className="fl" href="/artists">4 Artists</Link>
            <Link className="fl" href="/fans">4 Fans</Link>
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
