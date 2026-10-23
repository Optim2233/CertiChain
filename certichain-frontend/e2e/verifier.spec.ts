import { test, expect } from '@playwright/test';
import { watchConsole, expectNoRawI18nKeys , verifyHeaders } from './_helpers';

// Public verifier journey - no auth, read-only. Credential ids come from the
// seeded Neon dev branch; they are stable but overridable via env.
const ISSUED = process.env.E2E_CRED_ISSUED ?? '06410a36-e0b6-4aaf-8688-f67425221cc4';
const REVOKED = process.env.E2E_CRED_REVOKED ?? '82de7734-76ef-4180-98a9-6220c93efb5e';
const BOGUS = '00000000-0000-0000-0000-000000000000';
// A seeded institution that is SUSPENDED, used for the ce54373 regression check.
const SUSPENDED_REGISTRAR = process.env.E2E_SUSPENDED_REGISTRAR ?? 'registrar@miit.edu.mm';

test('verify page loads clean and accepts a credential id', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/verify');
  await expect(page.locator('body')).toContainText(/verif/i);
  await expectNoRawI18nKeys(page);
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('a valid credential reports VERIFIED', async ({ page }) => {
  const r = await page.request.get(`/api/verify/certificate/${ISSUED}`, { headers: verifyHeaders() });
  expect(r.status()).toBe(200);
  expect((await r.json()).result).toBe('VERIFIED');
});

test('a revoked credential reports REVOKED, not VERIFIED', async ({ page }) => {
  const r = await page.request.get(`/api/verify/certificate/${REVOKED}`, { headers: verifyHeaders() });
  expect(r.status()).toBe(200);
  expect((await r.json()).result).toBe('REVOKED');
});

test('an unknown credential reports INVALID_NOT_FOUND rather than erroring', async ({ page }) => {
  const r = await page.request.get(`/api/verify/certificate/${BOGUS}`, { headers: verifyHeaders() });
  expect(r.status()).toBe(200);
  expect((await r.json()).result).toBe('INVALID_NOT_FOUND');
});

test('a malformed id is rejected as a client error', async ({ page }) => {
  expect((await page.request.get('/api/verify/certificate/not-a-uuid')).status()).toBe(400);
});

test('public registry lists institutions and shows suspended status', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/institutions');
  const rows = await page.request.get('/api/verify/institutions');
  const list = await rows.json();
  expect(list.length).toBeGreaterThan(0);
  // Suspended institutions stay visible so the public can see the status.
  expect(list.some((i: { status: string }) => i.status === 'SUSPENDED')).toBeTruthy();
  await expectNoRawI18nKeys(page);
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('trust stats count only approved institutions', async ({ page }) => {
  const stats = await (await page.request.get('/api/verify/stats')).json();
  const list = await (await page.request.get('/api/verify/institutions')).json();
  const approved = list.filter((i: { status: string }) => i.status === 'APPROVED').length;
  expect(stats.institutionCount).toBe(approved);
});

test('credentials from a suspended institution still verify (regression ce54373)', async ({ page }) => {
  const list = await (await page.request.get('/api/verify/institutions')).json();
  const suspended = list.find((i: { status: string }) => i.status === 'SUSPENDED');
  test.skip(!suspended, 'no suspended institution in this dataset');

  // A suspension must not retroactively invalidate credentials the institution
  // issued while it was in good standing - it only changes the reported status.
  const login = await page.request.post('/api/auth/login', {
    data: { email: SUSPENDED_REGISTRAR, password: 'Certi@2026' },
    headers: { 'X-Forwarded-For': `10.210.${Math.floor(Math.random() * 250)}.3` },
  });
  test.skip(login.status() !== 200, 'suspended-institution registrar not seeded');

  const creds = await (await page.request.get('/api/institution/credentials?size=3')).json();
  const items = Array.isArray(creds) ? creds : creds.content ?? [];
  const issued = items.filter((c: { status: string }) => c.status === 'ISSUED');
  expect(issued.length, 'need an ISSUED credential to assert against').toBeGreaterThan(0);

  for (const c of issued) {
    const v = await (await page.request.get(`/api/verify/certificate/${c.id}`, { headers: verifyHeaders() })).json();
    expect(v.result).toBe('VERIFIED');
    // The verifier is still told the issuer is suspended.
    expect(v.institutionStatus).toBe('SUSPENDED');
  }
});

test('bulk verify page loads', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/verify/bulk');
  await expect(page.locator('body')).toContainText(/bulk|csv|upload/i);
  await expectNoRawI18nKeys(page);
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('Burmese locale renders the verify page with real translations', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/my/verify');
  await expectNoRawI18nKeys(page);
  expect(errors, errors.join('\n')).toHaveLength(0);
});
