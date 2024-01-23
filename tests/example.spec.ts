import { test, expect } from '@playwright/test';
import { DebugPlaywright } from '../lib/debug';

test('2xx', async ({ page }) => {
  const dp = new DebugPlaywright(page);
  dp.formatContent = true;
  dp.addListener();
  await page.goto('https://example.com');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx JSON', async ({ page }) => {
  test.skip(process.env.CI === 'true', 'do not test wezterm under CI');
  const dp = new DebugPlaywright(page);
  dp.formatContent = true;
  dp.addListener();
  await page.goto('https://filesamples.com/samples/code/json/sample1.json');

  await expect(page).not.toHaveTitle('title');
});

test('2xx png', async ({ page }) => {
  test.skip(process.env.CI === 'true', 'do not test wezterm under CI');
  const dp = new DebugPlaywright(page);
  dp.formatContent = true;
  dp.addListener();
  await page.goto('https://vilerichard.com/static/photos/group1.jpg');

  await expect(page).not.toHaveTitle('title');
});

test('4xx', async ({ page }) => {
  const dp = new DebugPlaywright(page);
  dp.formatContent = true;
  dp.addListener();
  await page.goto('https://example.com/404');

  await expect(page).toHaveTitle(/Example Domain/);
});

test('2xx screenshot default', async ({ page }) => {
  test.skip(process.env.CI === 'true', 'do not test wezterm under CI');
  const dp = new DebugPlaywright(page);
  dp.screenshots = true;
  dp.addListener();
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});
