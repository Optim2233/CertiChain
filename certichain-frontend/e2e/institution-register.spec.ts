import { test, expect, Page } from '@playwright/test';
import { watchConsole, expectNoRawI18nKeys } from './_helpers';

// The 4-step institution application wizard, with the Myanmar-standardized inputs
// (cascading address, composed NRC, canonicalized phone). Each run uses a unique
// email so the spec is re-runnable; created rows are listed in audit/run-manifest.md.
const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function toProfileStep(page: Page, kind: 'public' | 'private') {
  await page.goto('/register');
  const card = page.locator('button').filter({ hasText: new RegExp(kind, 'i') }).first();
  // The wizard is a client component: a click landing before React hydrates is
  // dropped silently, so retry until the selection actually sticks.
  await expect(async () => {
    await card.click();
    await expect(card).toHaveClass(/border-\[#0462BA\]/, { timeout: 2000 });
  }).toPass({ timeout: 30000 });
  await page.getByRole('button', { name: /next/i }).first().click();
  await page.getByPlaceholder('University of Information Technology').waitFor({ timeout: 20000 });
}

async function fillProfile(page: Page, name: string, email: string) {
  await page.getByPlaceholder('University of Information Technology').fill(name);
  await page.getByPlaceholder('you@institution.edu').fill(email);
  await page.getByPlaceholder('9123456789').fill('09123456789');
  await page.locator('input[type="password"]').first().fill('Certi@2026');
}

test('wizard step 1 renders without console errors or raw i18n keys', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/register');
  await expect(page.locator('body')).toContainText(/public|private/i);
  await expectNoRawI18nKeys(page);
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('address selects cascade: region then district then township', async ({ page }) => {
  await toProfileStep(page, 'public');
  const selects = page.locator('select');
  const region = selects.filter({ has: page.locator('option', { hasText: /Yangon Region/ }) }).first();
  await expect(region).toBeVisible();

  const district = selects.filter({ has: page.locator('option', { hasText: /Select district/i }) }).first();
  await expect(district).toBeDisabled();

  await region.selectOption('Yangon');
  await expect(district).toBeEnabled();
  expect((await district.locator('option').allInnerTexts()).join('|')).toMatch(/Yangon West|Yangon South/);

  await district.selectOption('Yangon West');
  const township = selects.filter({ has: page.locator('option', { hasText: /Select township/i }) }).first();
  await expect(township).toBeEnabled();
  expect((await township.locator('option').allInnerTexts()).join('|')).toMatch(/Bahan|Kamayut/);

  // Changing the parent must clear the children.
  await region.selectOption('Mandalay');
  expect(await district.inputValue()).toBe('');
  expect(await township.inputValue()).toBe('');
});

test('postal code accepts only 5 digits', async ({ page }) => {
  await toProfileStep(page, 'public');
  const postal = page.getByPlaceholder('11181');
  await postal.fill('abc99xyz');
  expect(await postal.inputValue()).toBe('99');
  await postal.fill('1118199');
  expect(await postal.inputValue()).toHaveLength(5);
  await postal.fill('1118');
  await expect(page.locator('body')).toContainText(/5 digits/i);
});

test('Myanmar phone is canonicalized on blur', async ({ page }) => {
  await toProfileStep(page, 'public');
  const phone = page.getByPlaceholder('9123456789');
  await phone.fill('09 123 456 789');
  await phone.blur();
  expect(await phone.inputValue()).toBe('9123456789');
});

test('an invalid Myanmar phone shows an inline error', async ({ page }) => {
  await toProfileStep(page, 'public');
  const phone = page.getByPlaceholder('9123456789');
  await phone.fill('12345');
  await phone.blur();
  await expect(page.locator('body')).toContainText(/Myanmar mobile/i);
});

test('private application composes an NRC from its four parts', async ({ page }) => {
  await toProfileStep(page, 'private');
  await fillProfile(page, 'Thanlyin Institute of Marine Technology', `registrar.${uniq()}@timt.edu.mm`);
  await page.getByRole('button', { name: /next/i }).first().click();

  // The founder block's NRC controls are the first of each kind on the page
  // (the administrator block below repeats them).
  const regionSel = page.locator('select').filter({ has: page.locator('option', { hasText: /^Region$/ }) }).first();
  const codeSel = page.locator('select').filter({ has: page.locator('option', { hasText: /Township code/ }) }).first();
  const typeSel = page.locator('select').filter({ has: page.locator('option', { hasText: /Naing/ }) }).first();

  // Township codes stay empty until a region is chosen.
  await expect(codeSel).toBeDisabled();

  await regionSel.selectOption('12');
  await expect(codeSel).toBeEnabled();
  const yangon = (await codeSel.locator('option').allInnerTexts()).join('|');
  expect(yangon).toMatch(/BaHaNa|AhLaNa|KaMaNa/);
  // Codes issued under other regions must not appear under region 12.
  expect(yangon).not.toMatch(/MaBaNa/);

  await codeSel.selectOption('BaHaNa');
  await typeSel.selectOption('N');

  // The serial keeps 6 digits and drops non-digits, however the text arrives.
  const serial = page.getByPlaceholder(/6 digits/).first();
  await serial.fill('123456789');
  expect(await serial.inputValue()).toBe('123456');
  // Pasting mixed content must keep all six digits: maxLength used to truncate the raw
  // value before the digit filter ran, turning "12ab3456" into "1234" (findings #4).
  await serial.fill('');
  await serial.fill('12ab3456');
  expect(await serial.inputValue()).toBe('123456');
  await serial.fill('');
  await serial.pressSequentially('12ab34');
  expect(await serial.inputValue()).toBe('1234');

  // Switching region clears the now-invalid township code.
  await regionSel.selectOption('9');
  expect(await codeSel.inputValue()).toBe('');
});

test('the passport toggle swaps the NRC selectors for a text field', async ({ page }) => {
  await toProfileStep(page, 'private');
  await fillProfile(page, 'Passport Toggle College', `registrar.${uniq()}@ptc.edu.mm`);
  await page.getByRole('button', { name: /next/i }).first().click();

  await page.getByRole('button', { name: /use passport/i }).first().click();
  const pp = page.getByPlaceholder('MA123456').first();
  await expect(pp).toBeVisible();
  await pp.fill('bad');
  await expect(page.locator('body')).toContainText(/valid passport/i);
});

test('submitted payload carries a canonical +95 phone', async ({ page }) => {
  const email = `registrar.${uniq()}@ttc-e2e.edu.mm`;
  let sentPhone: string | null = null;
  page.on('request', (req) => {
    if (req.url().includes('/api/institution/apply') && req.method() === 'POST') {
      const body = req.postData() ?? '';
      sentPhone = /name="phone"\r?\n\r?\n([^\r\n]*)/.exec(body)?.[1] ?? null;
    }
  });

  await toProfileStep(page, 'public');
  await page.getByPlaceholder('University of Information Technology').fill('Thanlyin Technological College');
  await page.getByPlaceholder('you@institution.edu').fill(email);
  await page.getByPlaceholder('9123456789').fill('09 781 234 567');
  await page.locator('input[type="password"]').first().fill('Certi@2026');
  await page.getByRole('button', { name: /next/i }).first().click();

  const ministry = page.locator('select').filter({ has: page.locator('option', { hasText: /Ministry of Education/ }) }).first();
  await ministry.selectOption('Ministry of Education');
  await page.getByRole('button', { name: /next/i }).first().click();

  await page.locator('input[type="file"]').first().setInputFiles('../scripts/seed/sample-doc.pdf');
  await page.locator('input[type="checkbox"]').last().check();
  await page.getByRole('button', { name: /submit/i }).first().click();

  await expect(page.locator('body')).toContainText(/Application Submitted/i, { timeout: 45000 });
  // The applicant typed "09 781 234 567"; it must be stored canonicalized.
  const aa = await page.request.post('/api/auth/login', {
    data: { email: 'aa@certichain.local', password: 'aa-dev-password' },
    headers: { 'X-Forwarded-For': `10.120.${Math.floor(Math.random() * 250)}.5` },
  });
  expect(aa.status()).toBe(200);
  const pending = await (await page.request.get('/api/aa/institutions?status=PENDING')).json();
  const mine = (Array.isArray(pending) ? pending : pending.content ?? []).find(
    (i: { name: string; phone?: string }) => i.phone === '+959781234567',
  );
  expect(mine, 'applied institution should be stored with a canonical +95 phone').toBeTruthy();
});

test('Burmese locale renders the wizard with real translations', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/my/register');
  await expectNoRawI18nKeys(page);
  expect(errors, errors.join('\n')).toHaveLength(0);
});
