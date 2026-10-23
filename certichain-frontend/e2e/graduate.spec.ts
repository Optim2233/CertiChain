import { test, expect, APIRequestContext } from '@playwright/test';
import { verifyHeaders } from './_helpers';

// Graduate journey: a credential issued to an unregistered email, claimed at signup,
// then shared with selective disclosure and verified publicly.
// Institution account is seeded (SEED-CREDENTIALS.md); graduates are created per run.

const INSTITUTION = { email: 'registrar@uit.edu.mm', password: 'Certi@2026' };
const xff = () => ({ 'X-Forwarded-For': `10.${100 + Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 250)}.7` });
const uniqEmail = () => `thiri.aung.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@gmail.com`;

async function issueTo(api: APIRequestContext, graduateEmail: string, title: string) {
  const login = await api.post('/api/auth/login', { data: INSTITUTION, headers: xff() });
  expect(login.status()).toBe(200);
  const res = await api.post('/api/institution/credentials', {
    data: {
      graduate_email: graduateEmail,
      // A unique field keeps the duplicate-issuance guard from rejecting re-runs.
      fields: [
        { name: 'title', value: title },
        { name: 'gpa', value: '3.88' },
        { name: 'ref', value: Math.random().toString(36).slice(2, 10) },
      ],
    },
    headers: xff(),
  });
  expect(res.status()).toBe(200);
  await api.post('/api/auth/logout');
  return (await res.json()).id as string;
}

test('a credential issued to an unregistered email waits in PENDING_CLAIM', async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const email = uniqEmail();
  await issueTo(api, email, 'BE Civil Engineering');

  const check = await api.post('/api/graduate/signup/check', { data: { email }, headers: xff() });
  expect(check.status()).toBe(200);
  expect((await check.json()).pendingCredentialCount).toBe(1);
  await api.dispose();
});

test('graduate signup via /api/graduate/signup claims pending credentials', async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const email = uniqEmail();
  const credId = await issueTo(api, email, 'BE Mechanical Engineering');

  const signup = await api.post('/api/graduate/signup', {
    data: { email, password: 'Certi@2026', firstName: 'Thiri', lastName: 'Aung' },
    headers: xff(),
  });
  expect(signup.status()).toBe(200);

  // Claimed: nothing left pending, and the credential now verifies as issued.
  const after = await api.post('/api/graduate/signup/check', { data: { email }, headers: xff() });
  expect((await after.json()).pendingCredentialCount).toBe(0);
  const verify = await api.get(`/api/verify/certificate/${credId}`, { headers: verifyHeaders() });
  expect((await verify.json()).result).toBe('VERIFIED');

  const login = await api.post('/api/auth/login', { data: { email, password: 'Certi@2026' }, headers: xff() });
  expect(login.status()).toBe(200);
  const timeline = await api.get('/api/graduate/timeline');
  expect((await timeline.json()).length).toBe(1);
  await api.dispose();
});

test('signup via /api/auth/signup claims pending credentials (findings #1 fixed)', async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const email = uniqEmail();
  const credId = await issueTo(api, email, 'BSc Physics');

  const before = await api.post('/api/graduate/signup/check', { data: { email }, headers: xff() });
  expect((await before.json()).pendingCredentialCount).toBe(1);

  // This is the endpoint the graduate registration page calls. The claim loop used to
  // live only in GraduateServiceImpl.signup, so these users saw an empty wallet; it now
  // runs for any GRADUATE signup (AuthService.signup).
  const signup = await api.post('/api/auth/signup', {
    data: { email, password: 'Certi@2026', role: 'GRADUATE' },
    headers: xff(),
  });
  expect(signup.status()).toBe(200);

  const after = await api.post('/api/graduate/signup/check', { data: { email }, headers: xff() });
  expect((await after.json()).pendingCredentialCount, 'credential should be claimed at signup').toBe(0);

  // The signup response carries the session cookie, so the wallet is reachable immediately.
  const timeline = await api.get('/api/graduate/timeline');
  expect((await timeline.json()).length).toBe(1);
  expect((await (await api.get(`/api/verify/certificate/${credId}`, { headers: verifyHeaders() })).json()).result)
    .toBe('VERIFIED');
  await api.dispose();
});

test('a share discloses only the selected fields and stops verifying once revoked', async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const email = uniqEmail();
  const credId = await issueTo(api, email, 'MSc Marine Biology');

  await api.post('/api/graduate/signup', {
    data: { email, password: 'Certi@2026', firstName: 'Su', lastName: 'Myat' },
    headers: xff(),
  });
  expect((await api.post('/api/auth/login', { data: { email, password: 'Certi@2026' }, headers: xff() })).status()).toBe(200);

  const fields = await (await api.get(`/api/graduate/credentials/${credId}/fields`)).json();
  const titleId = fields.find((f: { fieldName: string }) => f.fieldName === 'title').id;

  const share = await api.post('/api/graduate/shares', {
    data: { credentialId: credId, scope: 'SINGLE_CREDENTIAL', name: 'For employer', selectedFieldIds: [titleId] },
    headers: xff(),
  });
  expect(share.status()).toBe(200);
  const { id: shareId, shareToken } = await share.json();

  const pub = await playwright.request.newContext({ baseURL });
  const seen = await (await pub.get(`/api/verify/share/${shareToken}`, { headers: verifyHeaders() })).json();
  expect(seen.result).toBe('VERIFIED');
  const names = (seen.disclosedFields ?? []).map((f: { name?: string; fieldName?: string }) => f.name ?? f.fieldName);
  expect(names).toEqual(['title']);
  // Undisclosed values must not leak anywhere in the payload.
  expect(JSON.stringify(seen)).not.toContain('3.88');

  expect((await api.post(`/api/graduate/shares/${shareId}/revoke`, { data: {}, headers: xff() })).status()).toBe(200);
  expect((await (await pub.get(`/api/verify/share/${shareToken}`, { headers: verifyHeaders() })).json()).result).toBe('SHARE_REVOKED');

  await pub.dispose();
  await api.dispose();
});

test('a graduate can flag a credential and the issuer can resolve it', async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const email = uniqEmail();
  const credId = await issueTo(api, email, 'BSc Botany');

  await api.post('/api/graduate/signup', { data: { email, password: 'Certi@2026', firstName: 'Hla' }, headers: xff() });
  expect((await api.post('/api/auth/login', { data: { email, password: 'Certi@2026' }, headers: xff() })).status()).toBe(200);

  const flag = await api.post(`/api/graduate/credentials/${credId}/flag`, {
    data: { reason: 'The GPA on this record is wrong' },
    headers: xff(),
  });
  expect(flag.status()).toBe(200);
  expect((await flag.json()).status).toBe('OPEN');
  expect((await (await api.get('/api/graduate/disputes')).json()).length).toBeGreaterThan(0);
  await api.post('/api/auth/logout');

  // The issuing institution sees and dismisses it.
  expect((await api.post('/api/auth/login', { data: INSTITUTION, headers: xff() })).status()).toBe(200);
  const disputes = await (await api.get('/api/institution/disputes')).json();
  const mine = disputes.find((d: { credentialId: string }) => d.credentialId === credId);
  expect(mine, 'issuer should see the graduate flag').toBeTruthy();
  const dismiss = await api.post(`/api/institution/disputes/${mine.id}/dismiss`, {
    data: { resolution_note: 'Checked against registrar records; the GPA is correct.' },
    headers: xff(),
  });
  expect(dismiss.status()).toBe(200);
  await api.dispose();
});

test('the duplicate-issuance guard rejects an identical credential', async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const email = uniqEmail();
  expect((await api.post('/api/auth/login', { data: INSTITUTION, headers: xff() })).status()).toBe(200);
  // The guard keys on credential content, so make this run's content unique; the
  // point of the test is that the SECOND identical post is refused.
  const payload = {
    data: {
      graduate_email: email,
      fields: [{ name: 'title', value: `BA History ${Math.random().toString(36).slice(2, 10)}` }],
    },
    headers: xff(),
  };
  expect((await api.post('/api/institution/credentials', payload)).status()).toBe(200);
  const dup = await api.post('/api/institution/credentials', payload);
  expect(dup.status()).toBe(400);
  expect(JSON.stringify(await dup.json())).toMatch(/identical/i);
  await api.dispose();
});
