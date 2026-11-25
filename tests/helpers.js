const { expect } = require('@playwright/test');

// 1×1 PNG used as a "photo" in upload tests
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const photo = (name = 'photo.png') => ({ name, mimeType: 'image/png', buffer: PNG });

/** Opens the app in demo mode and signs in as one of the demo users. */
async function loginAs(page, name) {
  await page.goto('/?demo#/');
  await page.locator('.user-row', { hasText: name }).click();
  await expect(page.locator('.jobs-view')).toBeVisible();
}

/** Opens a job's detail screen. */
async function openJob(page, id) {
  await page.goto(`/?demo#/job/${id}`);
  await expect(page.locator(`[data-job="${id}"]`)).toBeVisible();
}

const cards = (page) => page.locator('.job-list .job-card');
const statusChip = (page) => page.locator('.detail-head .chip').first();
const toast = (page) => page.locator('.toast').last();

module.exports = { photo, loginAs, openJob, cards, statusChip, toast };
