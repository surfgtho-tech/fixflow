const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

test.describe('Login', () => {
  test('demo mode lists the manager and the staff', async ({ page }) => {
    await page.goto('/?demo#/');
    await expect(page.locator('.demo-bar, .login')).toHaveCount(1);
    const users = page.locator('.user-row');
    await expect(users).toHaveCount(3);
    await expect(users.nth(0)).toContainText('Boss');
    await expect(users.nth(0)).toContainText('Manager · admin');
    await expect(users.nth(1)).toContainText('Staff 1');
    await expect(users.nth(2)).toContainText('Staff 2');
  });

  test('staff signs in and sees a personal greeting', async ({ page }) => {
    await loginAs(page, 'Staff 1');
    await expect(page.locator('.hero h1')).toContainText('Staff 1');
    await expect(page.locator('.demo-bar')).toBeVisible();
  });

  test('session survives a reload and sign out returns to the login', async ({ page }) => {
    await loginAs(page, 'Boss');
    await page.reload();
    await expect(page.locator('.hero h1')).toContainText('Boss');

    await page.locator('.nav-item', { hasText: 'Profile' }).click();
    await expect(page.locator('.profile')).toContainText('Manager · admin');
    await page.locator('#logout').click();
    await expect(page.locator('.user-row')).toHaveCount(3);
  });

  test('live mode shows the email/password form with a link to the demo', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('#login input[name=email]')).toBeVisible();
    await expect(page.locator('#login input[name=password]')).toBeVisible();
    await page.getByText('Try the demo').click();
    await expect(page.locator('.user-row')).toHaveCount(3);
  });
});
