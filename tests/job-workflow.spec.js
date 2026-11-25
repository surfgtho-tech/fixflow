const { test, expect } = require('@playwright/test');
const { loginAs, openJob, statusChip, toast, photo, cards } = require('./helpers');

test.describe('Job workflow (staff)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'Staff 1');
    await openJob(page, 1002);
  });

  test('tenant contact buttons build the right links', async ({ page }) => {
    const contact = page.locator('.contact-actions');
    await expect(contact.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:0830000002');
    await expect(contact.getByRole('link', { name: 'SMS' })).toHaveAttribute('href', 'sms:0830000002');
    await expect(contact.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/353830000002');
    await expect(contact.locator('.contact-btn.disabled', { hasText: 'Email' })).toBeVisible();
  });

  test('On my way → offers a message to the tenant → Start', async ({ page }) => {
    await page.locator('#actWay').click();
    const sheet = page.locator('.sheet');
    await expect(sheet).toContainText('Let the tenant know?');
    await expect(sheet.locator('.quote')).toContainText("I'm on my way to Parnell Road");
    await expect(sheet.getByRole('link', { name: 'SMS' })).toHaveAttribute('href', /^sms:0830000002\?&body=Hi%20Filipe/);
    await expect(sheet.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/353830000002\?text=/);
    await sheet.getByRole('button', { name: 'Skip' }).click();
    await expect(statusChip(page)).toHaveText('On the way');

    await page.locator('#actStart').click();
    await expect(statusChip(page)).toHaveText('In progress');
    await expect(page.locator('.timeline')).toContainText('changed status to In progress');
  });

  test('Finish as resolved requires a photo and closes the job', async ({ page }) => {
    await page.locator('#actFinish').click();
    await page.locator('#saveFin').click();
    await expect(toast(page)).toContainText('Add at least one photo');

    await page.locator('#finMsg').fill('Heater and holder replaced.');
    await page.locator('#finPics input[type=file]').setInputFiles(photo());
    await expect(page.locator('#finPics .thumb')).toHaveCount(1);
    await page.locator('#saveFin').click();

    await expect(page).toHaveURL(/#\/jobs$/);
    await expect(toast(page)).toContainText('Job completed');
    await page.locator('[data-tab=done]').click();
    await expect(cards(page).filter({ hasText: 'Bathroom heater & shower holder' })).toHaveCount(1);

    await openJob(page, 1002);
    await expect(page.locator('.done-banner')).toContainText('Job completed');
    await expect(page.locator('.timeline')).toContainText('marked it as resolved');
    await expect(page.locator('.timeline .thumb')).toHaveCount(1);
  });

  test('Finish as not resolved keeps it open and orders parts', async ({ page }) => {
    await page.locator('#actFinish').click();
    await page.locator('.choice-opt.hold').click();
    await expect(page.locator('#saveFin')).toContainText('Keep job open');

    await page.locator('#saveFin').click();
    await expect(toast(page)).toContainText('Explain why');

    await page.locator('#finMsg').fill('Need the right shower holder size.');
    await page.locator('#partRows .pr-desc').first().fill('Chrome shower holder 22mm');
    await page.locator('#partRows .pr-qty').first().fill('2');
    await page.locator('#saveFin').click();

    await expect(statusChip(page)).toHaveText('Kept open');
    await expect(page.locator('.parts')).toContainText('Chrome shower holder 22mm');
    await expect(page.locator('.parts')).toContainText('× 2');
    await expect(page.locator('.timeline')).toContainText('kept the job open');
  });

  test('add a note with photos at any time', async ({ page }) => {
    await page.locator('#addNote').click();
    await page.locator('#saveNote').click();
    await expect(toast(page)).toContainText('Write a note or add a photo');

    await page.locator('#noteMsg').fill('Tenant not home, left a card.');
    await page.locator('#notePics input[type=file]').setInputFiles([photo('a.png'), photo('b.png')]);
    await expect(page.locator('#notePics .thumb')).toHaveCount(2);
    await page.locator('#saveNote').click();

    await expect(page.locator('.timeline li').first()).toContainText('Tenant not home, left a card.');
    await expect(page.locator('.timeline li').first().locator('.thumb')).toHaveCount(2);
  });

  test('request a part', async ({ page }) => {
    await page.locator('#addPart').click();
    await page.locator('#pDesc').fill('Wall heater 2kW');
    await page.locator('#pQty').fill('1');
    await page.locator('#savePart').click();
    await expect(page.locator('.parts')).toContainText('Wall heater 2kW');
    await expect(page.locator('.parts .chip')).toHaveText('Requested');
  });

  test('photos open full screen', async ({ page }) => {
    await page.locator('#addNote').click();
    await page.locator('#notePics input[type=file]').setInputFiles(photo());
    await page.locator('#saveNote').click();
    await page.locator('.timeline .thumb').first().click();
    await expect(page.locator('.lightbox img')).toBeVisible();
    await page.locator('.lb-close').click();
    await expect(page.locator('.lightbox')).toHaveCount(0);
  });
});
