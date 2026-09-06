// Guards the EN/MM i18n contract so the bug classes fixed in the 2026 audit
// cannot silently return: locale-less date/number formatting, EN/MY key or
// placeholder drift, stray non-Myanmar codepoints in my.json, literal-English
// toasts, and backend display copy missing from the backend-copy mapper.
//
// Static assertions in the style of check-require-auth.mjs: fast, no browser,
// runnable via `npm run check`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out = walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(e) && !/\.test\.(tsx?|mjs)$/.test(e)) out.push(p);
  }
  return out;
}
const sources = walk(path.join(root, 'src'));

// --- 1. Dictionary parity: keys and ICU placeholders -----------------------
function flat(o, prefix, out) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === 'object') flat(v, prefix + k + '.', out);
    else out[prefix + k] = String(v);
  }
  return out;
}
const en = flat(JSON.parse(readFileSync(path.join(root, 'messages', 'en.json'), 'utf8')), '', {});
const my = flat(JSON.parse(readFileSync(path.join(root, 'messages', 'my.json'), 'utf8')), '', {});
for (const k of Object.keys(en)) check(k in my, `my.json missing key: ${k}`);
for (const k of Object.keys(my)) check(k in en, `en.json missing key: ${k}`);
const vars = (s) => {
  const names = new Set();
  const re = /\{(\w+)[^}]*\}/g;
  let m;
  while ((m = re.exec(s))) names.add(m[1]);
  return [...names].sort().join(',');
};
for (const k of Object.keys(en)) {
  if (k in my) check(vars(en[k]) === vars(my[k]), `placeholder mismatch: ${k}`);
}

// --- 2. No locale-less date/number formatting ------------------------------
// toLocale*(locale, …) obeys the EN|မြန်မာ toggle; bare/undefined/[] falls
// back to the browser locale and makes the toggle look broken for dates.
const LOCALE_LESS = /toLocale(?:DateString|DateTimeString|TimeString|String|NumberString)\s*\(\s*(\)|undefined\b|\[\s*\]|["'])/;
for (const f of sources) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    check(!LOCALE_LESS.test(ln), `${path.relative(root, f)}:${i + 1} locale-less formatter: ${ln.trim().slice(0, 90)}`);
  });
}

// --- 3. Dictionary codepoint allowlists ------------------------------------
// my.json must hold Myanmar + ASCII + explicitly allowlisted symbols only
// (this caught a U+FFFD + Cyrillic corruption once); en.json ASCII + symbols.
const MYANMAR_OK = (c) => c >= 0x1000 && c <= 0x109f;
const ASCII_OK = (c) => c >= 0x20 && c <= 0x7e;
const SYMBOLS = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x2026, 0x2192, 0x00b7, 0x00d7, 0x2265, 0x2713, 0x1f44b, 0x1f319]);
for (const [file, ok] of [
  // en.json also carries language autonyms ("myanmar": "မြန်မာ" for the toggle).
  ['messages/en.json', (c) => ASCII_OK(c) || MYANMAR_OK(c) || SYMBOLS.has(c)],
  ['messages/my.json', (c) => ASCII_OK(c) || MYANMAR_OK(c) || SYMBOLS.has(c)],
]) {
  const lines = readFileSync(path.join(root, file), 'utf8').split('\n');
  lines.forEach((ln, i) => {
    for (const ch of ln) {
      const c = ch.codePointAt(0);
      if (!ok(c)) {
        check(false, `${file}:${i + 1} unexpected U+${c.toString(16)}: ${ln.trim().slice(0, 80)}`);
        break;
      }
    }
  });
}

// --- 4. No literal-English toasts ------------------------------------------
// Toasts must go through t(); a template literal or quoted first arg means
// untranslated copy reaching the user.
const LITERAL_TOAST = /toast\.(success|error|info|warning|loading)\s*\(\s*[`"'"]/;
for (const f of sources) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    check(!LITERAL_TOAST.test(ln), `${path.relative(root, f)}:${i + 1} literal toast: ${ln.trim().slice(0, 90)}`);
  });
}

// --- 5. Backend display copy covered by the mapper --------------------------
// Backend sends English sentences, not codes (AuditEvents.java, notify() and
// audit() call sites). Every such literal must appear in backend-copy.ts —
// either as an EXACT key or inside a PATTERNS regex — or it renders raw on
// the MY UI. Skipped gracefully when the backend checkout is absent.
const mapperPath = path.join(root, 'src', 'i18n', 'backend-copy.ts');
const mapper = readFileSync(mapperPath, 'utf8');
const backendRoot = path.join(root, '..', 'certichain-backend', 'src', 'main', 'java');
let backendFiles = [];
try {
  const walkJava = (dir, out = []) => {
    for (const e of readdirSync(dir)) {
      const p = path.join(dir, e);
      if (statSync(p).isDirectory()) out = walkJava(p, out);
      else if (e.endsWith('.java')) out.push(p);
    }
    return out;
  };
  backendFiles = walkJava(backendRoot);
} catch { /* backend checkout absent - coverage check skipped */ }
if (backendFiles.length > 0) {
  // Plural fragments that only ever occur inside a larger template.
  const FRAGMENTS = new Set([' time', ' times', ' dispute was', ' disputes were']);
  const literals = new Set();
  for (const f of backendFiles) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/public static final String \w+ = "([^"]+)"/g)) literals.add(m[1]);
    for (const m of src.matchAll(/(?:notify|audit)\w*\(\s*"([^"]+)"(?:\s*,\s*"((?:[^"\\]|\\.)*)")?/g)) {
      literals.add(m[1]);
      if (m[2] !== undefined) literals.add(m[2]);
    }
    for (const m of src.matchAll(/auditLogService\.log\(\s*"([^"]+)"/g)) literals.add(m[1]);
  }
  for (const lit of literals) {
    if (lit.length < 4 || FRAGMENTS.has(lit)) continue;
    check(
      mapper.includes(lit),
      `backend copy not mapped in backend-copy.ts: "${lit.slice(0, 70)}"`,
    );
  }
}

assert.deepEqual(failures, [], `\ni18n guard failures:\n- ${failures.join('\n- ')}`);
console.log('i18n: all checks passed');
