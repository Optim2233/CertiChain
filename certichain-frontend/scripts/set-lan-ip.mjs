// Detects this machine's current LAN IP and writes it into .env.local as
// DEV_LAN_IP, read by next.config.ts to populate allowedDevOrigins, so LAN
// phone testing works after switching Wi-Fi networks without a manual edit.
// The API URL is NOT written here anymore - the browser talks to the Next
// origin and next.config.ts rewrites /api/* to the backend.
import { networkInterfaces } from 'node:os';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local');

function findLanIp() {
  const nets = networkInterfaces();
  const names = Object.keys(nets);
  // Prefer real Wi-Fi/Ethernet adapters over VPN/virtual ones (outline-tap0,
  // WSL vEthernet, etc.), which also report a non-internal IPv4.
  const preferred = names.filter((n) => /wi-?fi|ethernet/i.test(n));
  for (const name of [...preferred, ...names]) {
    for (const net of nets[name] ?? []) {
      // ponytail: first matching IPv4 wins; if you have multiple active
      // real adapters, pass the IP explicitly as argv[2].
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const ip = process.argv[2] || findLanIp();
if (!ip) {
  console.error('Could not detect a LAN IP. Pass one explicitly: node scripts/set-lan-ip.mjs 172.20.52.169');
  process.exit(1);
}

function setVar(content, name, value) {
  const line = `${name}=${value}`;
  return new RegExp(`^${name}=.*$`, 'm').test(content)
    ? content.replace(new RegExp(`^${name}=.*$`, 'm'), line)
    : content + line + '\n';
}

let updated = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
updated = setVar(updated, 'DEV_LAN_IP', ip);
// Drop the old key if a previous run wrote it - the rewrite handles the API now.
updated = updated.replace(/^NEXT_PUBLIC_API_BASE_URL=.*\n?/m, '');

writeFileSync(envPath, updated);
console.log(`Set DEV_LAN_IP=${ip}`);
console.log(`On THIS machine and on your phone, open: http://${ip}:3000`);
console.log(`(the backend just needs to be reachable at BACKEND_ORIGIN, default localhost:8081)`);
