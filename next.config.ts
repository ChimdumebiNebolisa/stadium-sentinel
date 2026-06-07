import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/ingest/bootstrap": ["data/elastic/**/*.json"],
  },
};

export default nextConfig;
