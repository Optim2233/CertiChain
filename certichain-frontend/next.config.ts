import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// next.config.ts runs before Next's own env injection, so .env.local has to
// be loaded explicitly here to read DEV_LAN_IP.
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  // LAN phone testing (QR/verify flows) only - dev-only, no effect on prod
  // build. DEV_LAN_IP is written by scripts/set-lan-ip.mjs (run automatically
  // by `npm run dev`), so this follows the dev machine across Wi-Fi networks
  // without a manual edit.
  allowedDevOrigins: process.env.DEV_LAN_IP ? [process.env.DEV_LAN_IP] : [],
};

export default nextConfig;
