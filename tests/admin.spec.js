const { test, expect } = require('@playwright/test');
const { loginAs, openJob, statusChip, toast, photo, cards } = require('./helpers');

test.describe('Manager (admin)', () => {
  test('staff cannot create, edit or delete jobs', async ({ page }) => {
    await loginAs(page, 'Staff 1');
    await expect(page.locator('.nav-fab')).toHaveCount(0);
    await expect(page.locator('.nav-item', { hasText: 'Parts' })).toHaveCount(0);
    await openJob(page, 1003);
    await expect(page.locator('a[href^="#/edit"]')).toHaveCount(0);
    await expect(page.locator('#delJob')).toHaveCount(0);

    await page.goto('/?demo#/new');
    await expect(page.locator('#jobForm')).toHaveCount(0);
    await expect(page.locator('.jobs-view')).toBeVisible();
  });

  test('creates a job with a photo and the assigned staff sees it', async ({ page }) => {
    await loginAs(page, 'Boss');
    await page.locator('.nav-fab').click();
    await expect(page.locator('#jobForm')).toBeVisible();

    await page.fill('input[name=title]', 'Leaking radiator valve');
    await page.fill('textarea[name=description]', 'Radiator in living room leaking at the valve.');
    await page.fill('input[name=address]', 'Smithfield Square, Dublin 7');
    await page.fill('input[name=client]', 'Liffey Lettings');
    await page.fill('input[name=tenant_name]', 'Test Tenant');
    await page.fill('input[name=tenant_phone]', '083 000 0009');
    await page.selectOption('select[name=assigned_to]', { label: 'Staff 2' });
    await page.locator('#jobPics input[type=file]').setInputFiles(photo());
    await page.locator('#jobForm [type=submit]').click();

    await expect(toast(page)).toContainText('Job #1009 created');
    await expect(page.locator('.detail-head h1')).toHaveText('Leaking radiator valve');
    await expect(page.locator('.job-photos .thumb')).toHaveCount(1);
    await expect(statusChip(page)).toHaveText('Scheduled');

    // Staff 2 now finds it in today's list, marked as theirs
    await page.locator('.nav-item', { hasText: 'Profile' }).click();
    await page.locator('#logout').click();
    await page.locator('.user-row', { hasText: 'Staff 2' }).click();
    await page.locator('[data-tab=today]').click();
    const card = cards(page).filter({ hasText: 'Leaking radiator valve' });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.jc-assignee')).toContainText('You');
  });

  test('form validation blocks a job without title or address', async ({ page }) => {
    await loginAs(page, 'Boss');
    await page.locator('.nav-fab').click();
    await page.locator('#jobForm [type=submit]').click();
    await expect(page).toHaveURL(/#\/new$/);
    const valid = await page.locator('input[name=title]').evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  test('edits and deletes a job', async ({ page }) => {
    await loginAs(page, 'Boss');
    await openJob(page, 1006);
    await page.locator('a[href="#/edit/1006"]').click();
    await page.fill('input[name=title]', 'Extractor fan replaced with quieter model');
    await page.locator('#jobForm [type=submit]').click();
    await expect(page.locator('.detail-head h1')).toHaveText('Extractor fan replaced with quieter model');

    page.once('dialog', (d) => d.accept());
    await page.locator('#delJob').click();
    await expect(toast(page)).toContainText('Job deleted');
    await page.locator('[data-tab=upcoming]').click();
    await expect(cards(page).filter({ hasText: 'Extractor fan' })).toHaveCount(0);
  });

  test('reopens a completed job', async ({ page }) => {
    await loginAs(page, 'Boss');
    await openJob(page, 1008);
    await page.locator('#reopen').click();
    await expect(statusChip(page)).toHaveText('Scheduled');
    await expect(page.locator('#actFinish')).toBeVisible();
  });

  test('parts board moves a part from requested to ordered to received', async ({ page }) => {
    await loginAs(page, 'Boss');
    await page.locator('.nav-item', { hasText: 'Parts' }).click();
    const part = page.locator('.part-card', { hasText: 'Kitchen tap cartridge' });
    await expect(part).toBeVisible();

    await part.locator('.part-select').selectOption('ordered');
    await expect(toast(page)).toContainText('Marked as ordered');
    await page.locator('[data-ptab=ordered]').click();
    await expect(page.locator('.part-card', { hasText: 'Kitchen tap cartridge' })).toBeVisible();

    await page.locator('.part-card .part-select').first().selectOption('received');
    await page.locator('[data-ptab=received]').click();
    await expect(page.locator('.part-card', { hasText: 'Kitchen tap cartridge' })).toBeVisible();

    await page.locator('.part-job').first().click();
    await expect(page).toHaveURL(/#\/job\/1004$/);
  });

  test('team list shows everyone and staff can be added in demo', async ({ page }) => {
    await loginAs(page, 'Boss');
    await page.locator('.nav-item', { hasText: 'Profile' }).click();
    await expect(page.locator('.team li')).toHaveCount(3);
    await page.fill('#addStaff input[name=name]', 'Staff 3');
    await page.fill('#addStaff input[name=email]', 'staff3@demo.ie');
    await page.locator('#addStaff button').click();
    await expect(page.locator('.team li')).toHaveCount(4);
  });
});
