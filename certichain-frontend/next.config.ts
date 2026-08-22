import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LAN phone testing (QR/verify flows) only - dev-only, no effect on prod build.
  allowedDevOrigins: ["192.168.8.155"],
};

export default nextConfig;
