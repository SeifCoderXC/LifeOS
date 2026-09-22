import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["openai"],
  transpilePackages: ["three"],
};

export default nextConfig;
