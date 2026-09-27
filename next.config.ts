import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // CSS intégrée au HTML : supprime la requête bloquante (connexions mobiles lentes, §55)
    inlineCss: true,
  },
};

export default nextConfig;
