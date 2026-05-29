import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js module - must not be bundled
  // @anthropic-ai/sdk uses Node.js streams and must not be bundled by Next.js
  serverExternalPackages: ['better-sqlite3', '@anthropic-ai/sdk'],
  // Use Turbopack config with root set to this project
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
