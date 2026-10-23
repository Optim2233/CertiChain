import { Page, expect } from '@playwright/test';

/** Collects console errors + page exceptions so specs can assert a clean page. */
export function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Next dev-server noise and offline font fetches are not app defects.
    if (/favicon|fonts\.googleapis|Download the React DevTools|turbopack-next/i.test(t)) return;
    errors.push(t);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Fails if any untranslated i18n key (e.g. "auth.someKey") is rendered. */
export async function expectNoRawI18nKeys(page: Page) {
  const body = await page.locator('body').innerText();
  const raw = body.match(/\b(auth|common|institution|graduate|authority|verify)\.[a-zA-Z][a-zA-Z0-9_]{2,}/g);
  expect(raw ?? [], `raw i18n keys rendered: ${JSON.stringify(raw)}`).toHaveLength(0);
}

export const CREDS = {
  aa: { email: 'aa@certichain.local', password: 'aa-dev-password' },
  institution: { email: 'registrar@uit.edu.mm', password: 'Certi@2026' },
};

/** Logs in through the real form and waits for the post-login landing. */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('textbox').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45000 }),
    page.getByRole('button', { name: /sign in|log in|login/i }).first().click(),
  ]);
}

/** Public /api/verify/* is rate-limited to 30 requests per IP; spread calls across IPs. */
export function verifyHeaders() {
  return { 'X-Forwarded-For': `10.${50 + Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}` };
}
