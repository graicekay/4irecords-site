import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The Google Site used spaced-out paths for two pages. Anything
     already shared or indexed under the old URLs keeps working. */
  async redirects() {
    return [
      { source: "/4-artists", destination: "/artists", permanent: true },
      { source: "/4-fans", destination: "/fans", permanent: true },
      { source: "/4artists", destination: "/artists", permanent: true },
      { source: "/4fans", destination: "/fans", permanent: true },
      { source: "/home", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
