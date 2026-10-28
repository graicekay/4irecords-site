import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The gated files and the MDX bodies are read from disk at request
     time, so they have to be traced into the serverless bundle —
     otherwise they exist locally and 500 in production. */
  outputFileTracingIncludes: {
    "/api/download/[slug]": ["./content/files/**"],
    "/resources/[slug]": ["./content/resources/**"],
    "/resources": ["./content/resources/**"],
    "/": ["./content/resources/**"],
  },

  /* The Google Site used spaced-out paths for two pages. Anything
     already shared or indexed under the old URLs keeps working. */
  async redirects() {
    return [
      { source: "/4-artists", destination: "/inquire?for=artist", permanent: true },
      /* /fans is hidden behind a flag, so its old URLs would land on a
         404. Point them at the list sign-up, which is the one thing
         that page did that still exists. */
      { source: "/4-fans", destination: "/inquire?for=updates", permanent: true },
      { source: "/4artists", destination: "/inquire?for=artist", permanent: true },
      { source: "/4fans", destination: "/inquire?for=updates", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      /* /vision is pulled until the marketplace and the events actually
         exist — Grace would rather say nothing than publish a roadmap.
         Temporary, not permanent: the page is coming back, and a 308
         would have browsers cache the redirect past its return. */
      { source: "/vision", destination: "/", permanent: false },
      /* /artists was the old "what we do + inquiry" page. Its job is
         now split between the landing page and the artist branch of
         /inquire, which is where its inbound links should land. */
      { source: "/artists", destination: "/inquire?for=artist", permanent: true },
      /* Scribbles' zip moved to Cloudflare R2 (28 Oct 2026), served through
         4iproductions.com/dl, which signs a short-lived link. Download links
         already emailed still point here. */
      {
        source: "/dl/:path*",
        destination: "https://www.4iproductions.com/dl/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
