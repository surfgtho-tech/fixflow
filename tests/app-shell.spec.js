const { test, expect } = require('@playwright/test');
const { loginAs, openJob } = require('./helpers');

test.describe('App shell & quality', () => {
  test('installable: manifest, icons and service worker are served', async ({ request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons) {
      const res = await request.get('/' + icon.src);
      expect(res.ok(), icon.src).toBeTruthy();
    }
    expect((await request.get('/sw.js')).ok()).toBeTruthy();
  });

  test('no horizontal scrolling on any main screen', async ({ page }) => {
    await loginAs(page, 'Boss');
    for (const hash of ['#/jobs', '#/job/1001', '#/new', '#/parts', '#/me']) {
      await page.goto('/?demo' + hash);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, hash).toBeLessThanOrEqual(1);
    }
  });

  test('no JavaScript errors while using the app', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await loginAs(page, 'Staff 1');
    for (const tab of ['overdue', 'today', 'upcoming', 'done']) await page.locator(`[data-tab=${tab}]`).click();
    await openJob(page, 1001);
    await page.goto('/?demo#/me');
    await expect(page.locator('.profile')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('unknown job shows a friendly message', async ({ page }) => {
    await loginAs(page, 'Staff 1');
    await page.goto('/?demo#/job/99999');
    await expect(page.locator('.empty')).toContainText('Job not found');
  });

  test('user text is escaped (no HTML injection)', async ({ page }) => {
    await loginAs(page, 'Boss');
    await openJob(page, 1003);
    await page.locator('#addNote').click();
    await page.locator('#noteMsg').fill('<img src=x onerror="window.__xss=1">');
    await page.locator('#saveNote').click();
    await expect(page.locator('.timeline')).toContainText('<img src=x');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });
});
