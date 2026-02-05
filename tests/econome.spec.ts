import { test, expect } from '@playwright/test';

test('Sidebar should receive econome:db-change events', async ({ page }) => {
  // Ensure role is set before mounting Sidebar
  // Navigate to app origin first so sessionStorage is accessible
  // Ensure sessionStorage is set before any application scripts run
  await page.addInitScript(() => {
    sessionStorage.setItem('role', 'ECONOME');
    sessionStorage.setItem('name', 'Test');
  });

  const logs: string[] = [];
  page.on('console', (msg) => {
    try {
      logs.push(String(msg.text()));
    } catch (e) {}
  });

  await page.goto('http://localhost:3000/econome');
  // Wait for Sidebar to mount (branding text present)
  await page.waitForSelector('text=IFPT MANAGER', { timeout: 3000 });

  // Sanity checks for debugging
  const currentRole = await page.evaluate(() => sessionStorage.getItem('role'));
  const hasSidebar = await page.$('aside');
  // expose to test output
  // eslint-disable-next-line no-console
  console.log('debug: role=', currentRole, 'hasSidebar=', Boolean(hasSidebar));

  // Dispatch a test event and assert Sidebar logged reception
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('econome:db-change', { detail: { source: 'test-e2e' } }));
  });

  await page.waitForTimeout(500);

  // Prefer checking a DOM dataset flag set by the Sidebar handler for reliability
  const flag = await page.evaluate(() => (document.documentElement as any).dataset.economeEventReceived || '');
  expect(flag).not.toBe('');
});
