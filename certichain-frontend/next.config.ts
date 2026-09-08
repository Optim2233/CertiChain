import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import createNextIntlPlugin from 'next-intl/plugin';

// next.config.ts runs before Next's own env injection, so .env.local has to
// be loaded explicitly here to read DEV_LAN_IP.
loadEnvConfig(process.cwd());

// The browser only ever talks to the Next origin; Next forwards /api/* to the
// backend server-side. That keeps the `jwt` cookie first-party (so proxy.ts and
// the axios 401 interceptor can rely on it) and means no CORS and no LAN-IP
// juggling for the API URL. Override BACKEND_ORIGIN for a non-local backend.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://localhost:8081';

const nextConfig: NextConfig = {
  // LAN phone testing (QR/verify flows) only - dev-only, no effect on prod
  // build. DEV_LAN_IP is written by scripts/set-lan-ip.mjs (run automatically
  // by `npm run dev`), so this follows the dev machine across Wi-Fi networks
  // without a manual edit.
  allowedDevOrigins: process.env.DEV_LAN_IP
      ? [process.env.DEV_LAN_IP, `${process.env.DEV_LAN_IP}:3000`, 'localhost:3000']
      : ['localhost:3000'],

  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_ORIGIN}/api/:path*` }];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
