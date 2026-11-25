const { test, expect } = require('@playwright/test');
const { loginAs, cards } = require('./helpers');

test.describe('Jobs list', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'Staff 1');
  });

  test('staff sees the whole team\'s jobs for today', async ({ page }) => {
    await page.locator('[data-tab=today]').click();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.locator('.jc-assignee.is-me')).toHaveCount(2);
    await expect(page.locator('.jc-assignee', { hasText: 'Staff 2' })).toHaveCount(1);
  });

  test('"My jobs" filter shows only my jobs', async ({ page }) => {
    await page.locator('[data-tab=today]').click();
    await page.selectOption('#staffFilter', { label: 'My jobs' });
    await expect(cards(page)).toHaveCount(2);
    await page.selectOption('#staffFilter', { label: 'Staff 2' });
    await expect(cards(page)).toHaveCount(1);
    await page.selectOption('#staffFilter', { label: 'Everyone' });
    await expect(cards(page)).toHaveCount(3);
  });

  test('tabs split overdue, upcoming and done jobs', async ({ page }) => {
    await page.locator('[data-tab=overdue]').click();
    await expect(cards(page)).toHaveCount(2);
    await expect(page.locator('[data-tab=overdue] .count')).toHaveText('2');

    await page.locator('[data-tab=upcoming]').click();
    await expect(cards(page)).toHaveCount(2);

    await page.locator('[data-tab=done]').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('Completed');
  });

  test('search filters by title, tenant or address', async ({ page }) => {
    await page.locator('[data-tab=overdue]').click();
    await page.locator('.search input').fill('boiler');
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('Boiler losing pressure');

    await page.locator('.search input').fill('Capel Street');
    await expect(cards(page)).toHaveCount(1);

    await page.locator('.search input').fill('nothing-matches-this');
    await expect(cards(page)).toHaveCount(0);
    await expect(page.locator('.empty')).toBeVisible();
  });

  test('directions offers Google Maps, Apple Maps and Waze', async ({ page }) => {
    await page.locator('[data-tab=today]').click();
    await cards(page).first().locator('[data-directions]').click();
    const sheet = page.locator('.sheet');
    await expect(sheet).toContainText('Get directions');
    const address = encodeURIComponent('14 Manor Street, Stoneybatter, Dublin 7');
    await expect(sheet.getByRole('link', { name: /Google Maps/ })).toHaveAttribute('href', new RegExp(`google\\.com/maps/dir/.*${address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    await expect(sheet.getByRole('link', { name: /Apple Maps/ })).toHaveAttribute('href', /maps\.apple\.com\/\?daddr=/);
    await expect(sheet.getByRole('link', { name: /Waze/ })).toHaveAttribute('href', /waze\.com\/ul\?q=.*navigate=yes/);
  });

  test('tapping a card opens the job', async ({ page }) => {
    await page.locator('[data-tab=today]').click();
    await cards(page).first().locator('h3').click();
    await expect(page).toHaveURL(/#\/job\/1001$/);
    await expect(page.locator('.detail-head h1')).toHaveText('Shower seals & balcony door seals');
  });
});
