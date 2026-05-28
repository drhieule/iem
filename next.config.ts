import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js module - must not be bundled
  serverExternalPackages: ['better-sqlite3'],
  // Use Turbopack config with root set to this project
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
