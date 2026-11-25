// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Tests run against the app in demo mode (?demo), so they never touch real company data.
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: process.platform === 'win32' ? 'python serve.py' : 'python3 serve.py',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
