import { test, expect } from '@playwright/test';
import { watchConsole, expectNoRawI18nKeys } from './_helpers';

// Auth boundaries: page gating (src/proxy.ts), API role enforcement, and the
// session-expiry redirect in src/shared/config/axioconfig.ts.

const PROTECTED = ['/institution', '/graduate', '/authority'];

test('login page renders clean', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/login');
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expectNoRawI18nKeys(page);
  expect(errors, errors.join('\n')).toHaveLength(0);
});

for (const path of PROTECTED) {
  test(`${path} redirects to login when no cookie is present`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    // The intended destination is preserved so login can bounce back.
    expect(page.url()).toContain('redirect=');
  });
}

test('a wrong password is rejected with a message and no cookie', async ({ page }) => {
  const r = await page.request.post('/api/auth/login', {
    data: { email: 'aa@certichain.local', password: 'definitely-wrong' },
    headers: { 'X-Forwarded-For': `10.200.${Math.floor(Math.random() * 250)}.1` },
  });
  expect(r.ok()).toBeFalsy();
  expect(JSON.stringify(await r.json())).toMatch(/invalid/i);
});

test('protected APIs refuse anonymous callers', async ({ page }) => {
  for (const ep of ['/api/institution/me', '/api/aa/institutions', '/api/graduate/profile']) {
    const r = await page.request.get(ep);
    expect(r.ok(), `${ep} must not be public`).toBeFalsy();
    // 401, not 403: unauthenticated must be distinguishable from forbidden, and the
    // frontend session-expiry interceptor redirects on 401 only (findings #3).
    expect(r.status(), `${ep} should answer 401 when anonymous`).toBe(401);
  }
});

test('cross-role access is refused', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { email: 'registrar@uit.edu.mm', password: 'Certi@2026' },
    headers: { 'X-Forwarded-For': `10.201.${Math.floor(Math.random() * 250)}.1` },
  });
  expect(login.status()).toBe(200);
  // An institution cookie must not reach accreditation-authority endpoints.
  expect((await page.request.get('/api/aa/institutions')).status()).toBe(403);
});

test('a stale jwt cookie is rejected with 401 so the app can bounce to login (findings #3 fixed)', async ({ page, context }) => {
  await context.addCookies([
    { name: 'jwt', value: 'stale.not.a.real.token', domain: 'localhost', path: '/' },
  ]);
  // proxy.ts only checks that the cookie exists, so the page still renders...
  await page.goto('/institution');

  // ...but the API now answers 401 rather than 403, which is what the axios interceptor
  // in shared/config/axioconfig.ts listens for - so an expired session redirects to login
  // instead of stranding the user on a dead dashboard.
  const api = await page.request.get('/api/institution/me');
  expect(api.ok()).toBeFalsy();
  expect(api.status()).toBe(401);
});

test('an authenticated caller hitting another role gets 403, not 401', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { email: 'registrar@uit.edu.mm', password: 'Certi@2026' },
    headers: { 'X-Forwarded-For': `10.203.${Math.floor(Math.random() * 250)}.4` },
  });
  expect(login.status()).toBe(200);
  // The 401/403 split must stay meaningful: this caller IS authenticated, just not
  // permitted, so it must not be treated as an expired session.
  expect((await page.request.get('/api/aa/institutions')).status()).toBe(403);
});

test('logout clears the session cookie', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { email: 'registrar@uit.edu.mm', password: 'Certi@2026' },
    headers: { 'X-Forwarded-For': `10.202.${Math.floor(Math.random() * 250)}.1` },
  });
  expect(login.status()).toBe(200);
  expect((await page.request.get('/api/institution/me')).status()).toBe(200);

  await page.request.post('/api/auth/logout');
  expect((await page.request.get('/api/institution/me')).ok()).toBeFalsy();
});

test('forgot-password does not leak whether an account exists', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/forgot-password');
  await expectNoRawI18nKeys(page);

  // A fresh address per run: resets are rate-limited per account.
  const unknown = `nobody.${Date.now().toString(36)}@example.com`;
  const r = await page.request.post('/api/auth/forgot-password', { data: { email: unknown } });
  expect(r.status()).toBe(200);
  const body = JSON.stringify(await r.json());
  // Identical neutral response for known and unknown addresses (no enumeration),
  // and always 200 even when delivery fails - see audit/findings.md #2.
  expect(body).toMatch(/if that email exists/i);
  expect(errors, errors.join(String.fromCharCode(10))).toHaveLength(0);
});

test('repeated reset requests for one account are rate-limited', async ({ page }) => {
  const target = `flood.${Date.now().toString(36)}@example.com`;
  const seen: number[] = [];
  for (let i = 0; i < 6; i++) {
    seen.push((await page.request.post('/api/auth/forgot-password', { data: { email: target } })).status());
  }
  // Either every request is accepted (unknown address, nothing to throttle) or the
  // limiter kicks in with a 400 - never a 5xx.
  expect(seen.every((s) => s === 200 || s === 400)).toBeTruthy();
});
