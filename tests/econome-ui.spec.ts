import { test, expect } from '@playwright/test';

test.describe('Econome UI open/close session', () => {
  test('open session via UI should notify Sidebar', async ({ page }) => {
    // ensure role before app scripts run
    await page.addInitScript(() => {
      sessionStorage.setItem('role', 'ECONOME');
      sessionStorage.setItem('name', 'UI Test');
    });

    await page.goto('http://localhost:3000/econome');
    // If a session is already open, close it first to ensure deterministic test
    const isOpen = await page.isVisible('text=SESSION OUVERTE');
    if (isOpen) {
      await page.goto('http://localhost:3000/econome/cloture');
      await page.waitForSelector('text=Valider et Clôturer la Session', { timeout: 5000 });
      await page.click('text=Valider et Clôturer la Session');
      await page.waitForSelector('.swal2-confirm', { timeout: 3000 });
      await page.click('.swal2-confirm');
      await page.waitForSelector('text=Aucune session ouverte', { timeout: 5000 });
      await page.goto('http://localhost:3000/econome');
    }

    // wait for the open session button (try header button, else fallback to floating button)
    try {
      await page.waitForSelector('text=SESSION FERMÉE - OUVRIR', { timeout: 1500 });
      await page.click('text=SESSION FERMÉE - OUVRIR');
    } catch (e) {
      await page.waitForSelector('text=OUVRIR LA CAISSE', { timeout: 5000 });
      await page.click('text=OUVRIR LA CAISSE');
    }
    await page.waitForSelector('#swal-fond', { timeout: 3000 });

    // fill a manual amount and confirm
    await page.fill('#swal-fond', '1000');
    await page.click('.swal2-confirm');

    // wait for session indicator
    await page.waitForSelector('text=SESSION OUVERTE', { timeout: 5000 });

    // verify Sidebar received event via dataset flag
    const flag = await page.evaluate(() => (document.documentElement as any).dataset.economeEventReceived || '');
    expect(flag).not.toBe('');
  });

  test('close session via UI should notify Sidebar and remove session', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('role', 'ECONOME');
      sessionStorage.setItem('name', 'UI Test');
    });

    await page.goto('http://localhost:3000/econome/cloture');
    // wait for the close button
    await page.waitForSelector('text=Valider et Clôturer la Session', { timeout: 5000 });

    // click close and confirm in Swal
    await page.click('text=Valider et Clôturer la Session');
    await page.waitForSelector('.swal2-confirm', { timeout: 3000 });
    await page.click('.swal2-confirm');

    // wait for the page to show no session
    await page.waitForSelector('text=Aucune session ouverte', { timeout: 5000 });
    const noSession = await page.isVisible('text=Aucune session ouverte');
    expect(noSession).toBe(true);
  });
});
