import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["peffle", "better-sqlite3"],
};

export default nextConfig;
