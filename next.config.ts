import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // /rights was a second library of the same law the assessment already
        // explains, and it split attention on a screen that should offer one
        // way forward. The directory is where its useful half lived.
        source: "/rights",
        destination: "/resources",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
