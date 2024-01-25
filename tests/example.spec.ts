import { test, expect } from '@playwright/test';
import { DebugPlaywright } from '../lib/debug';

test('2xx', async ({ page }) => {
  const dp = new DebugPlaywright(page);
  if (process.env.CI === 'true') {
    dp.command = 'terminal-image'
  }
  await page.goto('https://example.com');
  await new Promise(resolve => setTimeout(resolve, 100));

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx terminal-image', async ({ page }) => {
  const dp = new DebugPlaywright(page);
  dp.command = 'terminal-image';
  await page.goto('https://example.com');
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(page.getByRole('link', { name: /More information/ })).toBeTruthy();

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx JSON', async ({ page }) => {
  const dp = new DebugPlaywright(page, false);
  dp.formatContent = true;

  await page.goto('https://filesamples.com/samples/code/json/sample1.json');

  await expect(page).not.toHaveTitle('title');
});

test('2xx png', async ({ page }) => {
  const dp = new DebugPlaywright(page, false);
  dp.formatContent = true;
  if (process.env.CI === 'true') {
    dp.command = 'terminal-image'
  }
  await page.goto('https://vilerichard.com/static/photos/group1.jpg');

  await expect(page).not.toHaveTitle('title');
});

test('4xx', async ({ page }) => {
  const dp = new DebugPlaywright(page);
  dp.formatContent = true;
  if (process.env.CI === 'true') {
    dp.command = 'terminal-image'
  }
  await page.goto('https://example.com/404');
  await new Promise(resolve => setTimeout(resolve, 500));

  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx screenshot default', async ({ page }) => {
  const dp = new DebugPlaywright(page);
  dp.screenshots = true;
  if (process.env.CI === 'true') {
    dp.command = 'terminal-image'
  }
  await page.goto('https://example.com');
  await new Promise(resolve => setTimeout(resolve, 500));
  await expect(page).toHaveTitle(/Example Domain/);
});
