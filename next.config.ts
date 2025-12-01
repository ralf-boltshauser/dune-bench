import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Explicitly set workspace root to silence warning about multiple lockfiles
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
