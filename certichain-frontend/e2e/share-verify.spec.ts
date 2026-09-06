import { test, expect } from '@playwright/test';

test('share 7ba97 verifies via /share/[token] - capture both api calls', async ({ page }) => {
  const responses: { url: string; status: number; body: string; headers: Record<string,string> }[] = [];
  page.on('response', async (r) => {
    const url = r.url();
    if (url.includes('/api/verify/share/7ba9786f-59f9-4eb5-b715-25441b7769c4')) {
      let body = '';
      try { body = await r.text(); } catch {}
      responses.push({ url, status: r.status(), body: body.slice(0, 1000), headers: Object.fromEntries(Object.entries(r.headers()).slice(0, 10)) });
    }
  });

  await page.goto('/share/7ba9786f-59f9-4eb5-b715-25441b7769c4', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('=== RESPONSES for 7ba9786f ===');
  console.log(JSON.stringify(responses, null, 2));
  console.log('page content snippet:', (await page.content()).slice(0, 2000));

  // Also check visible result
  const hasVerified = await page.getByText(/Verified|Revoked|Link Not Found|Share Verified/i).first().isVisible().catch(() => false);
  console.log('hasVerified visible:', hasVerified);

  // Assert at least one 200
  const has200 = responses.some(r => r.status === 200);
  const has403 = responses.some(r => r.status === 403);
  console.log(`has200=${has200} has403=${has403} total=${responses.length}`);
  // Fail if all are 403
  expect(has200 || responses.length === 0).toBeTruthy();
});
