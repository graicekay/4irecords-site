import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.4irecords.com"),
  title: {
    default: "4i Records — We're 4 Artists.",
    template: "%s — 4i Records",
  },
  description:
    "An alternative record label in Salt Lake City. Artists keep 100% of their masters and music, and gain access to a network of resources that propels their growth.",
  openGraph: {
    type: "website",
    siteName: "4i Records",
    url: "https://www.4irecords.com",
    title: "4i Records — We're 4 Artists.",
    description:
      "Artists keep 100% of their masters and music. 4 Artists. 4 Fans. 4 Good.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
